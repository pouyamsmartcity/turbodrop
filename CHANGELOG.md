# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-11-02

First public release.

### Added

- **Engine** (`turbodrop-core`, Rust): UDP multicast discovery, add-by-IP, XChaCha20-Poly1305 encryption of every
  payload, X25519 device pairing with emoji verification codes and trusted devices, 4 MiB chunked transfers that resume
  after disconnects and app restarts, skip-identical and never-overwrite rules, safe path handling, transfer history.
- **Zero-install web client** for iPhone, iPad, Android and any browser: send and receive files, folders and text,
  photo/video previews, save all as ZIP, live speed, automatic retry and resume, paste and drag-and-drop, 12 languages
  with right-to-left support.
- **Windows desktop app** (Tauri 2 + Svelte 5): Mica glass UI, light/dark themes and five accents, device radar, QR
  code per network, approval dialog, toasts, tray, start with Windows, Explorer “Send with Turbodrop”, notifications,
  keep-awake during transfers. Also builds for macOS and Linux.
- **CLI** `turbodrop` (`receive`, `share`, `send`, `devices`, `--json`) with a QR code in the terminal.
- Tests: Rust unit and end-to-end tests, browser unit tests with crypto vectors shared with Rust, Playwright end-to-end
  tests on WebKit (iPhone), Android Chrome and desktop Chrome against the real binary.

[0.1.0]: https://github.com/pouyamsmartcity/turbodrop/releases/tag/v0.1.0
