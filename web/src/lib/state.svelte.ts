// App state and the transfer engine of the web client (Svelte 5 runes).
import { detectLang, isRtl, type Lang } from '../../../shared/i18n';
import { Api, chunkCount, HttpError, type DeviceInfo, type FileMeta, type Offer, type ServerEvent } from './api';
import { crc32, randomId, sessionFromFragment, type SessionKeys } from './crypto';
import { detectDevice, store } from './device';

export type ConnState = 'none' | 'connecting' | 'online' | 'offline' | 'revoked' | 'unreachable';

export interface OutFile {
  meta: FileMeta;
  file?: File;
  status: 'pending' | 'active' | 'done' | 'skipped' | 'failed';
  done: number;
  resumed: boolean;
}

export interface OutTransfer {
  id: string;
  files: OutFile[];
  text?: string;
  status: 'waiting' | 'active' | 'retrying' | 'done' | 'declined' | 'failed' | 'canceled';
  error?: string;
  speed: number;
  startedAt: number;
  abort: AbortController;
}

export interface InFile {
  meta: FileMeta;
  status: 'pending' | 'active' | 'done' | 'failed';
  done: number;
  crc: number;
  blob?: Blob;
  url?: string;
}

export interface InTransfer {
  id: string;
  from: string;
  files: InFile[];
  text?: string;
  status: 'offered' | 'active' | 'done' | 'failed' | 'canceled' | 'declined';
  speed: number;
  receivedAt: number;
  abort: AbortController;
}

const AUTO_RECEIVE_LIMIT = 300 * 1024 * 1024;
const PARALLEL_UPLOADS = 2;
const GIVE_UP_AFTER_MS = 5 * 60_000;

function sessionKey(): string {
  return `turbodrop.session.${location.host}`;
}

class SpeedMeter {
  private samples: [number, number][] = [];
  push(total: number): number {
    const now = performance.now();
    this.samples.push([now, total]);
    while (this.samples.length > 2 && now - this.samples[0][0] > 3000) this.samples.shift();
    const [t0, b0] = this.samples[0];
    return now > t0 ? ((total - b0) * 1000) / (now - t0) : 0;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class App {
  lang = $state<Lang>(detectLang());
  conn = $state<ConnState>('connecting');
  host = $state<DeviceInfo | null>(null);
  name = $state('');
  outgoing = $state<OutTransfer[]>([]);
  incoming = $state<InTransfer[]>([]);
  chunkSize = 4 * 1024 * 1024;

  api: Api | null = null;
  private stopEvents: (() => void) | null = null;
  private platform = detectDevice().platform;

  get rtl() {
    return isRtl(this.lang);
  }

  init() {
    const savedLang = store.get('turbodrop.lang');
    if (savedLang) this.lang = savedLang as Lang;
    this.name = store.get('turbodrop.name') || detectDevice().name;

    // Keys arrive in the URL fragment (never sent over the network). Keep them, then wipe the
    // fragment so the key does not sit in the address bar or browser history.
    let keys: SessionKeys | null = sessionFromFragment(location.hash);
    if (keys) {
      store.set(sessionKey(), `${keys.sid}.${keys.root}`);
      history.replaceState(null, '', location.pathname + location.search);
    } else {
      const saved = store.get(sessionKey());
      keys = saved ? sessionFromFragment(saved) : null;
    }
    if (!keys) {
      this.conn = 'none';
      return;
    }
    let clientId = store.get('turbodrop.client');
    if (!clientId) {
      clientId = randomId(12);
      store.set('turbodrop.client', clientId);
    }
    this.api = new Api(keys, clientId);
    void this.connect();
  }

  setLang(l: Lang) {
    this.lang = l;
    store.set('turbodrop.lang', l);
  }

  rename(n: string) {
    const v = n.trim().slice(0, 40);
    if (!v) return;
    this.name = v;
    store.set('turbodrop.name', v);
    void this.connect();
  }

  async connect() {
    if (!this.api) return;
    this.conn = this.host ? 'offline' : 'connecting';
    for (let attempt = 0; ; attempt++) {
      try {
        const w = await this.api.hello(this.name, this.platform);
        this.host = w.host;
        this.chunkSize = w.chunkSize;
        for (const o of w.pending) this.onOffer(o);
        break;
      } catch (e) {
        if (e instanceof HttpError && e.status === 401) {
          this.revoke();
          return;
        }
        this.conn = attempt > 2 ? 'unreachable' : 'connecting';
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
      }
    }
    this.stopEvents?.();
    this.stopEvents = this.api.events(
      (e) => this.onEvent(e),
      (online) => {
        if (online) this.conn = 'online';
        else if (this.conn !== 'revoked') {
          this.conn = 'offline';
          // A 401 on reconnect means the QR code was reset; hello tells us.
          this.api?.hello(this.name, this.platform).then(
            (w) => {
              this.host = w.host;
              for (const o of w.pending) this.onOffer(o);
            },
            (err) => {
              if (err instanceof HttpError && err.status === 401) this.revoke();
            },
          );
        }
      },
    );
  }

  private revoke() {
    this.stopEvents?.();
    this.stopEvents = null;
    store.del(sessionKey());
    this.conn = 'revoked';
  }

  private onEvent(e: ServerEvent) {
    if (e.type === 'offer') this.onOffer(e.offer);
    else if (e.type === 'cancel') {
      const t = this.incoming.find((x) => x.id === e.transferId);
      if (t && t.status !== 'done') {
        t.abort.abort();
        t.status = 'canceled';
      }
    }
  }

  // ----- phone → computer ------------------------------------------------------------------

  async sendFiles(list: File[]) {
    if (!this.api || list.length === 0) return;
    const files: OutFile[] = list.map((f) => ({
      meta: {
        id: randomId(),
        name: f.name,
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        size: f.size,
        mime: f.type || undefined,
        modified: f.lastModified || undefined,
      },
      file: f,
      status: 'pending',
      done: 0,
      resumed: false,
    }));
    await this.runOutgoing(files, undefined);
  }

  async sendText(text: string) {
    const t = text.trim();
    if (!this.api || !t) return;
    await this.runOutgoing([], t);
  }

  private async runOutgoing(files: OutFile[], text: string | undefined) {
    const api = this.api!;
    this.outgoing.unshift({
      id: randomId(12),
      files,
      text,
      status: 'waiting',
      speed: 0,
      startedAt: Date.now(),
      abort: new AbortController(),
    });
    // Work on the reactive proxy so the UI follows every change.
    const t = this.outgoing[0];
    try {
      const reply = await api.offer({
        transferId: t.id,
        sender: { id: api.clientId, name: this.name, platform: this.platform },
        files: files.map((f) => f.meta),
        text,
      });
      if (!reply.accepted) {
        t.status = 'declined';
        return;
      }
      for (const p of reply.files) {
        const f = t.files.find((x) => x.meta.id === p.id);
        if (!f) continue;
        if (p.decision === 'skip') {
          f.status = 'skipped';
          f.done = f.meta.size;
        } else if (p.nextIndex > 0) {
          f.resumed = true;
          f.done = Math.min(p.nextIndex * this.chunkSize, f.meta.size);
        }
      }
      t.status = 'active';
      const meter = new SpeedMeter();
      const queue = t.files.map((_, i) => i).filter((i) => t.files[i].status !== 'skipped');
      const startIndex = new Map(reply.files.map((p) => [p.id, p.nextIndex]));
      const worker = async () => {
        while (queue.length) {
          const i = queue.shift()!;
          await this.uploadFile(t, t.files[i], startIndex.get(t.files[i].meta.id) ?? 0, meter);
        }
      };
      await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));
      if (t.status === 'active' || t.status === 'retrying') t.status = 'done';
      t.speed = 0;
    } catch (e) {
      if (t.status === 'canceled') return;
      t.status = 'failed';
      t.error = e instanceof Error ? e.message : String(e);
      if (e instanceof HttpError && e.status === 401) this.revoke();
    }
  }

  private async uploadFile(t: OutTransfer, f: OutFile, start: number, meter: SpeedMeter) {
    const api = this.api!;
    const cs = this.chunkSize;
    const n = chunkCount(f.meta.size, cs);
    const total = () => t.files.reduce((s, x) => s + x.done, 0);
    f.status = 'active';
    let i = start;
    let failingSince = 0;
    const prepare = async (idx: number) => {
      const blob = f.file!.slice(idx * cs, Math.min(f.meta.size, (idx + 1) * cs));
      const plain = new Uint8Array(await blob.arrayBuffer());
      return { idx, len: plain.length, sealed: api.sealChunk(t.id, f.meta.id, idx, idx + 1 === n, plain) };
    };
    // Read + encrypt the next chunk while the current one is on the wire.
    let next: Promise<{ idx: number; len: number; sealed: Uint8Array }> | null = prepare(i);
    while (i < n) {
      if (t.abort.signal.aborted) throw new Error('canceled');
      const cur = next && (await next);
      const chunk = cur && cur.idx === i ? cur : await prepare(i);
      next = i + 1 < n ? prepare(i + 1) : null;
      try {
        await api.upload(t.id, f.meta.id, i, i + 1 === n, chunk.sealed, t.abort.signal);
        failingSince = 0;
        if (t.status === 'retrying') t.status = 'active';
        f.done = Math.min(f.meta.size, i * cs + chunk.len);
        i++;
        t.speed = meter.push(total());
      } catch (e) {
        if (t.abort.signal.aborted) throw new Error('canceled');
        if (e instanceof HttpError) {
          if (e.status === 409 && typeof e.body.next === 'number') {
            i = e.body.next;
            next = null;
            continue;
          }
          if (e.status === 410) {
            t.status = 'canceled';
            throw e;
          }
          if (e.status !== 502 && e.status !== 503) {
            f.status = 'failed';
            throw e;
          }
        }
        // Network dropped (Wi-Fi switch, screen lock): keep trying, then resume where the computer is.
        failingSince ||= Date.now();
        if (Date.now() - failingSince > GIVE_UP_AFTER_MS) {
          f.status = 'failed';
          throw e;
        }
        t.status = 'retrying';
        t.speed = 0;
        await sleep(1500);
        try {
          i = await api.status(t.id, f.meta.id);
          next = null;
        } catch {
          /* still offline */
        }
      }
    }
    f.done = f.meta.size;
    f.status = 'done';
  }

  async cancelOut(t: OutTransfer) {
    t.abort.abort();
    t.status = 'canceled';
    try {
      await this.api?.cancel(t.id);
    } catch {
      /* already gone */
    }
  }

  // ----- computer → phone ------------------------------------------------------------------

  private onOffer(o: Offer) {
    if (this.incoming.some((x) => x.id === o.transferId)) return;
    this.incoming.unshift({
      id: o.transferId,
      from: o.sender.name,
      text: o.text,
      files: o.files.map((m) => ({ meta: m, status: 'pending', done: 0, crc: 0 })),
      status: o.files.length ? 'offered' : 'done',
      speed: 0,
      receivedAt: Date.now(),
      abort: new AbortController(),
    });
    const t = this.incoming[0];
    const total = o.files.reduce((s, f) => s + f.size, 0);
    if (o.files.length && total <= AUTO_RECEIVE_LIMIT) void this.receive(t);
    try {
      navigator.vibrate?.(30);
    } catch {
      /* not supported */
    }
  }

  async receive(t: InTransfer) {
    if (!this.api || t.status === 'active') return;
    t.status = 'active';
    const meter = new SpeedMeter();
    try {
      for (const f of t.files) {
        if (f.status === 'done') continue;
        await this.downloadFile(t, f, meter);
      }
      t.status = 'done';
      t.speed = 0;
    } catch (e) {
      if ((t.status as InTransfer['status']) === 'canceled' || (t.status as InTransfer['status']) === 'declined') return;
      t.status = 'failed';
      if (e instanceof HttpError && e.status === 401) this.revoke();
    }
  }

  private async downloadFile(t: InTransfer, f: InFile, meter: SpeedMeter) {
    const api = this.api!;
    const cs = this.chunkSize;
    const n = chunkCount(f.meta.size, cs);
    const parts: BlobPart[] = [];
    let crc = 0;
    f.status = 'active';
    const total = () => t.files.reduce((s, x) => s + x.done, 0);
    for (let i = 0; i < n; i++) {
      let plain: Uint8Array | null = null;
      let failingSince = 0;
      while (!plain) {
        if (t.abort.signal.aborted) throw new Error('canceled');
        try {
          plain = await api.download(t.id, f.meta.id, i, i + 1 === n, t.abort.signal);
        } catch (e) {
          if (t.abort.signal.aborted) throw e;
          if (e instanceof HttpError && e.status !== 502 && e.status !== 503) throw e;
          failingSince ||= Date.now();
          if (Date.now() - failingSince > GIVE_UP_AFTER_MS) throw e;
          await sleep(1500);
        }
      }
      crc = crc32(plain, crc);
      parts.push(plain as BlobPart);
      f.done = Math.min(f.meta.size, i * cs + plain.length);
      t.speed = meter.push(total());
    }
    f.crc = crc;
    f.blob = new Blob(parts, { type: f.meta.mime || 'application/octet-stream' });
    f.url = URL.createObjectURL(f.blob);
    f.status = 'done';
    try {
      await api.done(t.id, f.meta.id);
    } catch {
      /* the computer will see it next time */
    }
  }

  async decline(t: InTransfer) {
    t.abort.abort();
    t.status = 'declined';
    try {
      await this.api?.cancel(t.id, true);
    } catch {
      /* already gone */
    }
  }

  dismissIn(t: InTransfer) {
    for (const f of t.files) if (f.url) URL.revokeObjectURL(f.url);
    this.incoming = this.incoming.filter((x) => x !== t);
  }

  clearFinished() {
    this.outgoing = this.outgoing.filter((t) => t.status === 'active' || t.status === 'waiting' || t.status === 'retrying');
  }
}

export const app = new App();
