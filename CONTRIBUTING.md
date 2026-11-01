# Contributing to Turbodrop

Thanks for helping! Bug reports, translations, ideas and pull requests are all welcome.

## Project layout

| Path | What |
|---|---|
| `crates/core` | The engine: protocol, crypto, discovery, HTTP server, transfers. Most logic lives here. |
| `crates/cli` | The `turbodrop` command-line app. |
| `apps/desktop` | Tauri 2 desktop app (`src-tauri/` Rust shell, `src/` Svelte 5 UI). |
| `web` | The zero-install phone web client, embedded into the binaries at build time. |
| `shared` | Translations (`shared/i18n`) and UI pieces/design tokens shared by the desktop app and the web client. |
| `e2e` | Playwright tests that run the real binary against WebKit and Chromium. |
| `site` | The landing page on GitHub Pages. |
| `docs` | Protocol, screenshots. |

## Development

```bash
npm install
npm run build:web                 # build the phone client once (the Rust build embeds it)
cargo test                        # engine + CLI
npm run test:web                  # browser crypto/zip tests
cargo build -p turbodrop-cli && npm run e2e
npm run desktop:dev               # desktop app with hot reload
```

Point the phone web client's dev server at a running Turbodrop with `npm run dev -w web` (it proxies `/api` to
`127.0.0.1:47474`).

## Guidelines

- Keep the protocol compatible, or bump `turbodrop/1` and document it in [docs/PROTOCOL.md](docs/PROTOCOL.md).
  If you touch crypto labels or AAD formats, update `test-vectors/crypto.json` and both test suites.
- Every user-visible string goes through `shared/i18n` (English in `en.ts`; others fall back to English).
- Add a test for every bug fix. Security-relevant changes get an end-to-end test in `crates/core/tests/e2e.rs`.
- `cargo fmt`, `cargo clippy`, and `npm run check` should pass.

## Translations

Edit `shared/i18n/fa.ts` (Persian), or the language objects in `shared/i18n/more.ts`. Keep `{placeholders}` intact.
New language: add it to `LANGUAGES` in `shared/i18n/index.ts`.
