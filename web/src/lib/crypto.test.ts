import { describe, expect, it } from 'vitest';
import vectors from '../../../test-vectors/crypto.json';
import {
  b64urlDecode,
  b64urlEncode,
  chunkAad,
  crc32,
  derive,
  jsonAad,
  LABEL_DATA,
  open,
  openJson,
  seal,
  sealJson,
  sealWithNonce,
  sessionFromFragment,
} from './crypto';

describe('interop with the Rust core', () => {
  const root = b64urlDecode(vectors.rootKey);

  it('derives the same auth token and data key', () => {
    const s = sessionFromFragment(`#abcd1234.${vectors.rootKey}`)!;
    expect(s.token).toBe(vectors.authToken);
    expect(b64urlEncode(s.data)).toBe(vectors.dataKey);
    expect(b64urlEncode(derive(root, LABEL_DATA))).toBe(vectors.dataKey);
  });

  it('produces byte-identical sealed chunks and JSON', () => {
    const data = b64urlDecode(vectors.dataKey);
    const c = vectors.chunk;
    const sealed = sealWithNonce(
      data,
      b64urlDecode(c.nonce),
      chunkAad(c.transferId, c.fileId, c.index, c.last),
      new TextEncoder().encode(c.plaintext),
    );
    expect(b64urlEncode(sealed)).toBe(vectors.sealedChunk);
    const j = sealWithNonce(data, b64urlDecode(vectors.json.nonce), jsonAad(vectors.json.purpose), new TextEncoder().encode(vectors.json.plaintext));
    expect(b64urlEncode(j)).toBe(vectors.sealedJson);
    expect(openJson(data, 'hello', b64urlDecode(vectors.sealedJson))).toEqual({ a: 1 });
  });
});

describe('seal/open', () => {
  const key = new Uint8Array(32).fill(3);
  it('round-trips and rejects tampering', () => {
    const s = seal(key, chunkAad('t', 'f', 1, false), new Uint8Array([1, 2, 3]));
    expect([...open(key, chunkAad('t', 'f', 1, false), s)]).toEqual([1, 2, 3]);
    expect(() => open(key, chunkAad('t', 'f', 2, false), s)).toThrow();
    s[s.length - 1] ^= 1;
    expect(() => open(key, chunkAad('t', 'f', 1, false), s)).toThrow();
  });
  it('JSON helpers', () => {
    const s = sealJson(key, 'offer', { x: 'سلام' });
    expect(openJson(key, 'offer', s)).toEqual({ x: 'سلام' });
    expect(() => openJson(key, 'hello', s)).toThrow();
  });
});

describe('fragment parsing', () => {
  it('accepts valid and rejects junk', () => {
    expect(sessionFromFragment('#abc')).toBeNull();
    expect(sessionFromFragment('')).toBeNull();
    expect(sessionFromFragment(`#x.${vectors.rootKey}`)).toBeNull();
    expect(sessionFromFragment(`#sid12345.${vectors.rootKey}`)?.sid).toBe('sid12345');
  });
});

describe('crc32', () => {
  it('matches known values and is incremental', () => {
    const t = new TextEncoder().encode('123456789');
    expect(crc32(t)).toBe(0xcbf43926);
    expect(crc32(t.subarray(4), crc32(t.subarray(0, 4)))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});
