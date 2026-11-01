// Starts a real `turbodrop` CLI process as the "computer" side of a test.
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const ROOT = resolve(import.meta.dirname, '..', '..');
const BIN =
  process.env.TURBODROP_BIN ?? join(ROOT, 'target', process.env.TURBODROP_PROFILE ?? 'debug', process.platform === 'win32' ? 'turbodrop.exe' : 'turbodrop');

export interface Host {
  url: string;
  port: number;
  downloads: string;
  events: Record<string, unknown>[];
  waitFor(pred: (e: Record<string, any>) => boolean, ms?: number): Promise<Record<string, any>>;
  stop(): void;
}

export async function startHost(args: string[], name = 'Test-PC'): Promise<Host> {
  const dir = mkdtempSync(join(tmpdir(), 'turbodrop-e2e-'));
  const downloads = join(dir, 'downloads');
  const child: ChildProcess = spawn(BIN, [...args, '--json', '--port', '0', '--name', name, '--dir', downloads], {
    env: { ...process.env, TURBODROP_DATA_DIR: join(dir, 'data'), TURBODROP_DISCOVERY_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const events: Record<string, any>[] = [];
  const waiters: { pred: (e: Record<string, any>) => boolean; resolve: (e: Record<string, any>) => void }[] = [];
  createInterface({ input: child.stdout! }).on('line', (line) => {
    let e: Record<string, any>;
    try {
      e = JSON.parse(line);
    } catch {
      return;
    }
    events.push(e);
    for (const w of [...waiters]) {
      if (w.pred(e)) {
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(e);
      }
    }
  });
  let stderr = '';
  child.stderr!.on('data', (d) => (stderr += d));

  const waitFor = (pred: (e: Record<string, any>) => boolean, ms = 60_000) =>
    new Promise<Record<string, any>>((res, rej) => {
      const hit = events.find(pred);
      if (hit) return res(hit);
      const timer = setTimeout(() => rej(new Error(`timed out waiting for host event; stderr: ${stderr}`)), ms);
      waiters.push({ pred, resolve: (e) => (clearTimeout(timer), res(e)) });
    });

  const invite = await waitFor((e) => e.type === 'invite', 20_000);
  const port = invite.invite.port as number;
  const first = invite.invite.urls[0]?.url as string | undefined;
  // Tests use loopback; the fragment carries the room key exactly like the QR code.
  const fragment = first ? first.split('#')[1] : '';
  if (!fragment) throw new Error('host printed no invite URL (no LAN address on this machine?)');
  return {
    url: `http://127.0.0.1:${port}/#${fragment}`,
    port,
    downloads,
    events,
    waitFor,
    stop() {
      child.kill();
      setTimeout(() => rmSync(dir, { recursive: true, force: true }), 500);
    },
  };
}

export function pattern(len: number, seed = 0): Buffer {
  const b = Buffer.alloc(len);
  for (let i = 0; i < len; i++) b[i] = ((i * 2654435761) >>> 13) ^ seed;
  return b;
}
