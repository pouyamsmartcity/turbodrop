# Turbodrop protocol, version 1 (`turbodrop/1`)

This document is the reference for anyone writing a compatible client. The Rust implementation lives in
[`crates/core`](../crates/core/src); the browser client in [`web/src/lib`](../web/src/lib). Shared test vectors:
[`test-vectors/crypto.json`](../test-vectors/crypto.json).

## Transport

- One HTTP/1.1 server per device, default port **47474** (the next free port if taken). Plain HTTP on the LAN — all
  payloads are encrypted at the application layer, so phones never see certificate warnings.
- Discovery: UDP multicast **239.255.74.74:47474**, TTL 1.

## Discovery

Each device sends an announce on start, every 10 s, and in reply to any non-reply announce it hears:

```json
{ "proto": "turbodrop/1", "reply": false,
  "device": { "id": "Se1yKX6GT8T_rS2b", "name": "Studio PC", "platform": "windows", "version": "0.1.0",
              "port": 47474, "publicKey": "<X25519, base64url>", "fingerprint": "4A12-5D65-BC56-B6E4" } }
```

A peer is forgotten after 35 s of silence. Peers can also be added by address: `GET /api/v1/info` returns the same
`device` object.

## Cryptography

| Item | Definition |
|---|---|
| AEAD | XChaCha20-Poly1305. Sealed message = `nonce(24) ‖ ciphertext ‖ tag(16)`, random nonce per message |
| KDF | HKDF-SHA256, empty salt, 32-byte output |
| Chunk AAD | `td1|chunk|{transferId}|{fileId}|{index}|{last as 0/1}` |
| JSON AAD | `td1|json|{purpose}` — purposes: `hello`, `welcome`, `offer`, `offer-reply`, `event` |
| Chunk size | 4 MiB plaintext; chunk `i` covers bytes `[i·4MiB, min(size,(i+1)·4MiB))`; an empty file is one empty chunk |

### Browser room

The desktop app keeps a *room*: `sid` (random id) and a 32-byte `root` key, shown as a QR code
`http://<lan-ip>:<port>/#<sid>.<root as base64url>`. The fragment is never sent by browsers.

- `token = base64url(HKDF(root, "turbodrop/v1 auth"))` — sent as `x-td-sid` / `x-td-auth` headers (or `sid`/`auth`
  query parameters for the WebSocket). One-way from the root, so a passive listener learns nothing about the data key.
- `data = HKDF(root, "turbodrop/v1 data")` — seals every body in both directions.
- Rotating the room (new `sid` + `root`) disconnects every phone.

### Device to device

Each device has a long-term X25519 key. The sender makes an ephemeral key `e` and derives

```
key = HKDF(ikm = DH(e, R) ‖ DH(s, R), info = "turbodrop/v1 peer" ‖ E ‖ S ‖ R)
```

where `s/S` is the sender's static key and `R` the receiver's. The receiver computes the same from `DH(r, E) ‖ DH(r, S)`,
which authenticates the sender's static key. The offer carries `x-td-epk: E` and `x-td-spk: S`.
Both screens show a 4-emoji verification code: `SHA-256("turbodrop/v1 verify" ‖ min(A,B) ‖ max(A,B))`, first four bytes
mod 32 into a fixed emoji table.

## Endpoints

Browser (`/api/v1/b/…`, room-authenticated):

| Method | Path | Body → Response |
|---|---|---|
| POST | `/hello` | sealed `Hello{clientId,name,platform}` → sealed `Welcome{host,chunkSize,pending:[Offer]}` |
| GET | `/ws?sid&auth&client` | WebSocket; server pushes sealed `event`s: `{type:"offer",offer}` / `{type:"cancel",transferId}` |
| POST | `/offer` | sealed `Offer` → sealed `OfferReply` |
| PUT | `/upload/{tid}/{fid}?i=&last=` | sealed chunk → `{"next":n}` |
| GET | `/status/{tid}/{fid}` | → `{"next":n}` |
| GET | `/download/{tid}/{fid}?i=` | → sealed chunk (computer → phone) |
| POST | `/done/{tid}/{fid}` | phone confirms it has the whole file |
| POST | `/cancel/{tid}[?decline=1]` | cancel or decline |

Device (`/api/v1/p/…`, authenticated by the session key):

| Method | Path | |
|---|---|---|
| POST | `/offer` | headers `x-td-epk`, `x-td-spk`; sealed `Offer` → sealed `OfferReply` (may wait up to 2 min for the user) |
| PUT | `/upload/{tid}/{fid}?i=&last=` | sealed chunk |
| GET | `/status/{tid}/{fid}` | resume position |
| POST | `/cancel/{tid}` | |

### Offer

```json
{ "transferId": "…", "sender": { "id": "…", "name": "iPhone", "platform": "ios", "publicKey": "…" },
  "files": [ { "id": "f1", "name": "IMG_0001.MOV", "path": "Trip/IMG_0001.MOV", "size": 123456,
               "mime": "video/quicktime", "modified": 1761990000000 } ],
  "text": "optional message" }
```

`OfferReply = { accepted, files: [{ id, decision: "send" | "skip", nextIndex }], reason? }`.

## Receiving rules

- Chunks of a file are written strictly in order. An index below `next` is acknowledged and ignored (a retry); an index
  above it gets **409** `{"next": expected}`; a chunk whose length doesn't match its position gets **400**; a canceled
  transfer gets **410**.
- The file is written to `<name>.tdpart` and renamed when the last chunk arrives; its modification time is set to the
  sender's `modified`.
- **Resume:** the receiver keys partial files by `BLAKE3(senderId, path, size, modified[, hash])` and persists them, so a
  later offer of the same file — new transfer id, after a page reload or an app restart — gets `nextIndex > 0`.
- **Skip:** if the destination already has a file with the same name, size and modification time (±2 s), the decision is
  `skip`. Otherwise a free name is chosen: `name (2).ext`, `name (3).ext`, …
- **Paths** from the sender are untrusted: `..`, absolute paths, drive letters, UNC prefixes, reserved Windows names,
  forbidden characters, bidi controls and trailing dots/spaces are neutralised; everything stays inside the download
  folder.
