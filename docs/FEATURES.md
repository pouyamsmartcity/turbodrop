# Features and why they exist

Turbodrop's feature list came from research, not guesswork: we read the most-upvoted open requests of the popular
open-source file-sharing tools (November 2026) and built the ones that make the biggest difference. Each feature below has
automated tests; the column on the right shows what it answers.

| # | Feature | Where | Answers |
|---|---|---|---|
| 1 | **Zero-install phones, both directions** — QR code opens a web client that sends *and* receives | engine + web | LocalSend's “share via link” is download-only, one file at a time; LocalSend [#9](https://github.com/localsend/localsend/issues/9), [#2405](https://github.com/localsend/localsend/issues/2405) (web build) |
| 2 | **End-to-end encryption on every byte**, including the browser path, without certificate warnings | engine + web | PairDrop [#180](https://github.com/schlagmichdoch/PairDrop/issues/180); LocalSend's optional HTTPS shows a self-signed warning |
| 3 | **Emoji verification codes + trusted devices** | engine + desktop | PairDrop [#180](https://github.com/schlagmichdoch/PairDrop/issues/180) (“mark devices as verified”) |
| 4 | **Resume after drops, page reloads and app restarts** | engine + web | LocalSend [#1191](https://github.com/localsend/localsend/issues/1191); PairDrop [#120](https://github.com/schlagmichdoch/PairDrop/issues/120) |
| 5 | **Skip files already there; never overwrite** | engine | LocalSend [#443](https://github.com/localsend/localsend/issues/443), [#2478](https://github.com/localsend/localsend/issues/2478) |
| 6 | **Folders with their structure** | engine + web + desktop | PairDrop [#290](https://github.com/schlagmichdoch/PairDrop/issues/290) |
| 7 | **Save all as ZIP on the phone** (stored ZIP built from Blobs, no copy) | web | the one-file-at-a-time pain of browser downloads |
| 8 | **Photo/video previews** with long-press save to Photos | web | — |
| 9 | **Text, links, clipboard** (Ctrl+V on desktop and in the browser) | all | — |
| 10 | **Live speed, ETA, progress percentage** | all | PairDrop [#122](https://github.com/schlagmichdoch/PairDrop/issues/122) |
| 11 | **Automatic LAN discovery + add by IP** | engine | — |
| 12 | **QR code per network: Wi-Fi, Ethernet, hotspot, Tailscale/VPN** | engine + desktop | LocalSend [#1123](https://github.com/localsend/localsend/issues/1123) (Tailscale) |
| 13 | **Several phones at once, send to one or all** | engine + desktop | — |
| 14 | **Receive in the background:** tray, start with Windows (minimized) | desktop | LocalSend [#2201](https://github.com/localsend/localsend/issues/2201) |
| 15 | **“Send with Turbodrop” in the Explorer right-click menu** + drag files onto the window | desktop | — |
| 16 | **Approve/decline with auto-accept for trusted devices**; optional approval for phones | engine + desktop | — |
| 17 | **History** with Open / Show in folder | desktop | — |
| 18 | **Windows 11 look:** Mica, light/dark, 5 accents, custom title bar | desktop | LocalSend [#300](https://github.com/localsend/localsend/issues/300) (UI redesign) |
| 19 | **Native notifications + keep the PC awake during transfers** | desktop | — |
| 20 | **12 languages with right-to-left layouts and native digits** | all | — |
| 21 | **CLI with a QR code in the terminal and JSON events** | cli | — |
| 22 | **Parallel uploads with pipelined encryption** (read + encrypt the next chunk while the current one is on the wire) | web + engine | PairDrop [#44](https://github.com/schlagmichdoch/PairDrop/issues/44) (slow transfers) |
| 23 | **Safe paths:** traversal, Windows reserved names, bidi-spoofed extensions | engine | — |
| 24 | **Add to Home Screen** icon for one-tap reconnect | web | — |

## Not yet (honest list)

- Native Android and iOS apps with share-sheet integration (the browser path covers both today).
- Bluetooth / Wi-Fi Direct pairing when there is no shared network (LocalSend [#189](https://github.com/localsend/localsend/issues/189)).
- Signed Windows installer, winget, Microsoft Store.
- Interoperability with the LocalSend protocol.
