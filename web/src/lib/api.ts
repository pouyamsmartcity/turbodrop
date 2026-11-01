// Talks to the Turbodrop app that served this page. Every body is sealed with the room key.
import { chunkAad, open, openJson, seal, sealJson, type SessionKeys } from './crypto';

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  version: string;
  port: number;
  publicKey: string;
  fingerprint: string;
}

export interface FileMeta {
  id: string;
  name: string;
  path: string;
  size: number;
  mime?: string;
  modified?: number;
  hash?: string;
}

export interface Offer {
  transferId: string;
  sender: { id: string; name: string; platform: string; publicKey?: string };
  files: FileMeta[];
  text?: string;
}

export interface FilePlan {
  id: string;
  decision: 'send' | 'skip';
  nextIndex: number;
}

export interface OfferReply {
  accepted: boolean;
  files: FilePlan[];
  reason?: string;
}

export interface Welcome {
  host: DeviceInfo;
  chunkSize: number;
  pending: Offer[];
}

export type ServerEvent = { type: 'offer'; offer: Offer } | { type: 'cancel'; transferId: string };

export class HttpError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown> = {},
  ) {
    super(`HTTP ${status}`);
  }
}

export function chunkCount(size: number, chunkSize: number): number {
  return size === 0 ? 1 : Math.ceil(size / chunkSize);
}

export class Api {
  constructor(
    public keys: SessionKeys,
    public clientId: string,
    public base = '',
  ) {}

  private headers(): Record<string, string> {
    return { 'x-td-sid': this.keys.sid, 'x-td-auth': this.keys.token };
  }

  private async req(method: string, path: string, body?: Uint8Array, signal?: AbortSignal): Promise<Response> {
    const r = await fetch(this.base + path, {
      method,
      headers: this.headers(),
      body: body as BodyInit | undefined,
      signal,
      cache: 'no-store',
    });
    if (!r.ok) {
      let j: Record<string, unknown> = {};
      try {
        j = await r.json();
      } catch {
        /* not JSON */
      }
      throw new HttpError(r.status, j);
    }
    return r;
  }

  async hello(name: string, platform: string): Promise<Welcome> {
    const r = await this.req('POST', '/api/v1/b/hello', sealJson(this.keys.data, 'hello', { clientId: this.clientId, name, platform }));
    return openJson<Welcome>(this.keys.data, 'welcome', new Uint8Array(await r.arrayBuffer()));
  }

  async offer(offer: Offer): Promise<OfferReply> {
    const r = await this.req('POST', '/api/v1/b/offer', sealJson(this.keys.data, 'offer', offer));
    return openJson<OfferReply>(this.keys.data, 'offer-reply', new Uint8Array(await r.arrayBuffer()));
  }

  sealChunk(tid: string, fid: string, i: number, last: boolean, plain: Uint8Array): Uint8Array {
    return seal(this.keys.data, chunkAad(tid, fid, i, last), plain);
  }

  async upload(tid: string, fid: string, i: number, last: boolean, sealed: Uint8Array, signal?: AbortSignal): Promise<number> {
    const r = await this.req('PUT', `/api/v1/b/upload/${tid}/${fid}?i=${i}&last=${last ? 1 : 0}`, sealed, signal);
    const j = await r.json();
    return j.next as number;
  }

  async status(tid: string, fid: string): Promise<number> {
    const r = await this.req('GET', `/api/v1/b/status/${tid}/${fid}`);
    return (await r.json()).next as number;
  }

  async download(tid: string, fid: string, i: number, last: boolean, signal?: AbortSignal): Promise<Uint8Array> {
    const r = await this.req('GET', `/api/v1/b/download/${tid}/${fid}?i=${i}`, undefined, signal);
    return open(this.keys.data, chunkAad(tid, fid, i, last), new Uint8Array(await r.arrayBuffer()));
  }

  async done(tid: string, fid: string): Promise<void> {
    await this.req('POST', `/api/v1/b/done/${tid}/${fid}`);
  }

  async cancel(tid: string, decline = false): Promise<void> {
    await this.req('POST', `/api/v1/b/cancel/${tid}${decline ? '?decline=1' : ''}`);
  }

  /** Live events from the computer. Reconnects with backoff; returns a stop function. */
  events(onEvent: (e: ServerEvent) => void, onState: (online: boolean, code?: number) => void): () => void {
    let ws: WebSocket | null = null;
    let stopped = false;
    let delay = 500;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      if (stopped) return;
      const url = new URL(this.base || location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '/api/v1/b/ws';
      url.hash = '';
      url.search = new URLSearchParams({ sid: this.keys.sid, auth: this.keys.token, client: this.clientId }).toString();
      ws = new WebSocket(url.toString());
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        delay = 500;
        onState(true);
      };
      ws.onmessage = (m) => {
        if (!(m.data instanceof ArrayBuffer)) return;
        try {
          onEvent(openJson<ServerEvent>(this.keys.data, 'event', new Uint8Array(m.data)));
        } catch {
          /* not for us */
        }
      };
      ws.onclose = (e) => {
        ws = null;
        if (stopped) return;
        onState(false, e.code);
        timer = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 8000);
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      ws?.close();
    };
  }
}
