# Security

## Reporting a vulnerability

Please report security issues privately through
[GitHub Security Advisories](https://github.com/pouyamsmartcity/turbodrop/security/advisories/new). We aim to answer
within 72 hours. Please don't open public issues for vulnerabilities.

## Threat model

Turbodrop moves files between devices on the same local network. There is no server, account or cloud component.

### What is protected

| Attacker | Result |
|---|---|
| **Passive listener on the Wi‑Fi** (someone sniffing traffic) | Sees that two devices talk and roughly how much data moves. Cannot read file contents, file names, messages or the device list of a session: every body is sealed with XChaCha20-Poly1305. The browser's bearer token is a one-way HKDF output and gives no access to the data key. |
| **Another device on the LAN without the QR code** | Cannot join the browser room, upload, download or read anything. Unknown computers can only *ask* to send; the receiver must accept (unless it turned approval off). |
| **Malicious sender** | Cannot write outside the download folder (`..`, absolute paths, drive letters, UNC, reserved names and bidi tricks are neutralised), cannot overwrite existing files (new names are chosen), cannot truncate or reorder a file undetected (position and last-chunk flag are bound into each chunk's AEAD). |
| **Impersonating a trusted computer** | Device-to-device keys come from static-static X25519, so a different key gets a different session key and a different emoji code. A trusted device that shows up with a new key is flagged and needs approval again. |
| **Someone who saw your QR code** | Can join the room — the QR code *is* the key. Use **Reset QR code** to revoke every phone at once. |

### Known limitation: the browser page itself

The phone loads the web client over plain HTTP from the computer. That avoids certificate warnings (which most people
learn to click through, and which iOS makes painful), but it means an **active** attacker on the same network who can
intercept and modify HTTP traffic (for example by ARP spoofing) could serve a modified page and steal the key. This is
the same trust model as any LAN web interface (routers, printers, NAS).

Recommendations for hostile networks (hotel, conference, public Wi‑Fi):

- Prefer the computer's own hotspot, or a network you control.
- Between computers, use the Turbodrop app or CLI on both sides and compare the 4-emoji code.
- Reset the QR code afterwards.

### Other notes

- The phone stores the room key in `localStorage` for its origin (`http://<ip>:<port>`) so it can reconnect.
  Clearing site data removes it.
- Received files keep the sender's modification time; nothing is executed or opened automatically.
- The desktop app's identity key, room key, trusted devices and history live in the app data folder
  (`%APPDATA%\Turbodrop` on Windows).
- The HTTP server sends a strict Content-Security-Policy, `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer`
  for the web client.
- Dependencies are kept small; cryptography comes from RustCrypto (`chacha20poly1305`, `x25519-dalek`, `hkdf`) and the
  audited `@noble` libraries in the browser.
