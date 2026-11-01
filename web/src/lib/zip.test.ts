import { describe, expect, it } from 'vitest';
import { crc32 } from './crypto';
import { buildZip } from './zip';

// Tiny reader for the archive we write (stored entries only).
async function readZip(blob: Blob): Promise<Record<string, string>> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const v = new DataView(buf.buffer);
  const eocd = buf.length - 22;
  expect(v.getUint32(eocd, true)).toBe(0x06054b50);
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    const crc = v.getUint32(p + 16, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    const lnameLen = v.getUint16(local + 26, true);
    const data = buf.subarray(local + 30 + lnameLen, local + 30 + lnameLen + size);
    expect(crc32(data)).toBe(crc);
    out[name] = new TextDecoder().decode(data);
    p += 46 + nameLen;
  }
  return out;
}

describe('buildZip', () => {
  it('writes a valid archive with UTF-8 names and folders', async () => {
    const files = { 'سفر/یادداشت.txt': 'سلام', 'a.txt': 'hello', 'empty.bin': '' };
    const entries = Object.entries(files).map(([path, s]) => {
      const bytes = new TextEncoder().encode(s);
      return { path, data: new Blob([bytes]), crc: crc32(bytes), modified: Date.UTC(2026, 10, 1) };
    });
    const zip = buildZip(entries);
    expect(zip.type).toBe('application/zip');
    expect(await readZip(zip)).toEqual(files);
  });

  it('renames duplicate paths instead of writing two entries with one name', async () => {
    const b = new TextEncoder().encode('x');
    const zip = buildZip([
      { path: 'a.jpg', data: new Blob([b]), crc: crc32(b) },
      { path: 'a.jpg', data: new Blob([b]), crc: crc32(b) },
    ]);
    expect(Object.keys(await readZip(zip)).sort()).toEqual(['a (copy).jpg', 'a.jpg']);
  });
});
