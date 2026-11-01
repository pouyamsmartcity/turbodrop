// Turbodrop browser crypto. Mirrors crates/core/src/crypto.rs — the labels and AAD formats are
// part of the protocol (see docs/PROTOCOL.md). Pure JS so it also works on plain-http LAN pages,
// where browsers hide WebCrypto's SubtleCrypto.
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

export const LABEL_AUTH = 'turbodrop/v1 auth';
export const LABEL_DATA = 'turbodrop/v1 data';
export const NONCE_LEN = 24;
export const OVERHEAD = 24 + 16;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s: string): Uint8Array {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b.length % 4 === 0 ? '' : '='.repeat(4 - (b.length % 4));
  const bin = atob(b + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function derive(root: Uint8Array, label: string): Uint8Array {
  return hkdf(sha256, root, undefined, enc.encode(label), 32);
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function randomId(bytes = 9): string {
  return b64urlEncode(randomBytes(bytes));
}

/** nonce || ciphertext || tag */
export function sealWithNonce(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const ct = xchacha20poly1305(key, nonce, aad).encrypt(plaintext);
  const out = new Uint8Array(NONCE_LEN + ct.length);
  out.set(nonce, 0);
  out.set(ct, NONCE_LEN);
  return out;
}

export function seal(key: Uint8Array, aad: Uint8Array, plaintext: Uint8Array): Uint8Array {
  return sealWithNonce(key, randomBytes(NONCE_LEN), aad, plaintext);
}

export function open(key: Uint8Array, aad: Uint8Array, sealed: Uint8Array): Uint8Array {
  if (sealed.length < OVERHEAD) throw new Error('message too short');
  const nonce = sealed.subarray(0, NONCE_LEN);
  return xchacha20poly1305(key, nonce, aad).decrypt(sealed.subarray(NONCE_LEN));
}

export function chunkAad(transferId: string, fileId: string, index: number, last: boolean): Uint8Array {
  return enc.encode(`td1|chunk|${transferId}|${fileId}|${index}|${last ? 1 : 0}`);
}

export function jsonAad(purpose: string): Uint8Array {
  return enc.encode(`td1|json|${purpose}`);
}

export function sealJson(key: Uint8Array, purpose: string, value: unknown): Uint8Array {
  return seal(key, jsonAad(purpose), enc.encode(JSON.stringify(value)));
}

export function openJson<T>(key: Uint8Array, purpose: string, sealed: Uint8Array): T {
  return JSON.parse(dec.decode(open(key, jsonAad(purpose), sealed))) as T;
}

export interface SessionKeys {
  sid: string;
  root: string;
  token: string;
  data: Uint8Array;
}

/** Keys from the QR fragment `#<sid>.<rootKey>`. */
export function sessionFromFragment(fragment: string): SessionKeys | null {
  const m = /^#?([A-Za-z0-9_-]{4,64})\.([A-Za-z0-9_-]{43})$/.exec(fragment.trim());
  if (!m) return null;
  const root = b64urlDecode(m[2]);
  if (root.length !== 32) return null;
  return { sid: m[1], root: m[2], token: b64urlEncode(derive(root, LABEL_AUTH)), data: derive(root, LABEL_DATA) };
}

/** CRC-32 (zip). Incremental: pass the previous value. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array, prev = 0): number {
  let c = ~prev >>> 0;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
