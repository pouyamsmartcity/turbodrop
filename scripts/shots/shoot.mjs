// Renders the README / site screenshots from the real UIs.
//   node scripts/shots/shoot.mjs            (after `npm run build -w apps/desktop` and a release CLI build)
// Desktop shots use the real Svelte app with a mocked Tauri runtime (demo data);
// phone shots drive the real web client against a real `turbodrop share` process.
import { chromium, webkit } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import QRCode from 'qrcode';

const ROOT = resolve(import.meta.dirname, '..', '..');
const OUT = join(ROOT, 'docs', 'screenshots');
const DIST = join(ROOT, 'apps', 'desktop', 'dist');
mkdirSync(OUT, { recursive: true });
const only = process.argv[2];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };

async function desktopPage(browser, query) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const qr = await QRCode.toString('http://192.168.1.10:47474/#Qm3x9KpLw2Ta.7Hk2Jq9VrX4bN8sYc1LpE0wZ5uF3dGiAoT6mRyKxQe', { type: 'svg', margin: 1, color: { dark: '#0a0f24', light: '#ffffff' } });
  await page.addInitScript({ content: `window.__QR_SVG__ = ${JSON.stringify(qr)};` });
  await page.addInitScript({ path: join(import.meta.dirname, 'tauri-mock.js') });
  await page.route('http://turbodrop.demo/**', (route) => {
    const p = new URL(route.request().url()).pathname;
    const file = join(DIST, p === '/' ? 'index.html' : p);
    if (!existsSync(file)) return route.fulfill({ status: 404 });
    route.fulfill({ body: readFileSync(file), contentType: MIME[extname(file)] ?? 'application/octet-stream' });
  });
  await page.goto(`http://turbodrop.demo/?${query}`);
  await page.waitForSelector('nav button');
  await page.waitForTimeout(700);
  return page;
}

async function nav(page, index) {
  await page.locator('nav button').nth(index).click();
  await page.waitForTimeout(900);
}

async function desktopShots() {
  const browser = await chromium.launch();
  for (const [suffix, query] of [['', 'lang=en&theme=dark'], ['-light', 'lang=en&theme=light'], ['-fa', 'lang=fa&theme=dark']]) {
    const page = await desktopPage(browser, query);
    await page.evaluate(() => window.__emit('open-files', ['D:\\Videos\\Wedding-4K.mp4', 'D:\\Docs\\Thesis-final.pdf', 'D:\\Photos\\Holiday 2026', 'D:\\Music\\mix.flac']));
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(OUT, `desktop-home${suffix}.png`) });
    if (suffix) {
      await page.context().close();
      continue;
    }
    await page.getByRole('button', { name: 'Clear' }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, 'desktop-drop.png') });
    await nav(page, 1);
    await page.locator('.blip').nth(0).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, 'desktop-nearby.png') });
    await nav(page, 2);
    await page.screenshot({ path: join(OUT, 'desktop-phone.png') });
    await nav(page, 3);
    await page.screenshot({ path: join(OUT, 'desktop-transfers.png') });
    await nav(page, 4);
    await page.screenshot({ path: join(OUT, 'desktop-settings.png') });
    await nav(page, 0);
    await page.evaluate(() =>
      window.__emit('td-event', {
        type: 'incomingRequest',
        transfer: {
          id: 'rq', direction: 'in', kind: 'device', peerId: 'pc', peerName: 'Studio PC', peerPlatform: 'windows', status: 'waiting',
          files: [
            { id: '1', name: 'Final-Cut.mov', path: 'Project/Final-Cut.mov', size: 6.4e9, doneBytes: 0, status: 'pending', resumed: false },
            { id: '2', name: 'Color-Grade.drx', path: 'Project/Color-Grade.drx', size: 2.1e6, doneBytes: 0, status: 'pending', resumed: false },
            { id: '3', name: 'Music.wav', path: 'Project/Music.wav', size: 88e6, doneBytes: 0, status: 'pending', resumed: false },
          ],
          totalBytes: 6.49e9, doneBytes: 0, speed: 0, startedAt: Date.now(), verification: '🚀 🍉 🐳 ⚡',
        },
      }),
    );
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(OUT, 'desktop-request.png') });
    await page.context().close();
  }
  await browser.close();
}

// ----- phone (real binary) ---------------------------------------------------------------------

async function makePhotos(dir) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  const scenes = [
    'linear-gradient(180deg,#ff9a5a 0%,#ff5e7e 38%,#4b2a7b 70%,#0e1230 100%)',
    'linear-gradient(160deg,#2af598 0%,#009efd 60%,#0b1a3a 100%)',
    'linear-gradient(200deg,#f6d365 0%,#fda085 45%,#5b247a 100%)',
  ];
  const names = [];
  for (let i = 0; i < scenes.length; i++) {
    await page.setContent(`<body style="margin:0;height:100vh;background:${scenes[i]};position:relative;overflow:hidden">
      <div style="position:absolute;left:50%;top:${30 + i * 6}%;width:300px;height:300px;margin-left:-150px;border-radius:50%;background:rgba(255,255,255,.75);filter:blur(2px)"></div>
      <svg viewBox="0 0 900 500" style="position:absolute;bottom:0;width:100%" preserveAspectRatio="none"><path d="M0 500V260l140-110 120 90 170-170 160 150 110-80 200 160V500z" fill="rgba(10,14,40,.82)"/><path d="M0 500V360l200-80 160 70 220-120 320 150V500z" fill="#070912"/></svg></body>`);
    const p = join(dir, `IMG_${4810 + i}.JPG`);
    await page.screenshot({ path: p, type: 'jpeg', quality: 88 });
    names.push(p);
  }
  await browser.close();
  return names;
}

function startCli(args) {
  const dir = mkdtempSync(join(tmpdir(), 'turbodrop-shots-'));
  const bin = join(ROOT, 'target', 'release', process.platform === 'win32' ? 'turbodrop.exe' : 'turbodrop');
  const child = spawn(bin, [...args, '--json', '--port', '0', '--name', 'Pouyam-Laptop', '--dir', join(dir, 'dl')], {
    env: { ...process.env, TURBODROP_DATA_DIR: join(dir, 'data'), TURBODROP_DISCOVERY_PORT: '0' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return new Promise((res) => {
    createInterface({ input: child.stdout }).on('line', (l) => {
      try {
        const e = JSON.parse(l);
        if (e.type === 'invite') res({ child, url: `http://127.0.0.1:${e.invite.port}/#${e.invite.urls[0].url.split('#')[1]}` });
      } catch {}
    });
  });
}

async function phoneShots() {
  const tmp = mkdtempSync(join(tmpdir(), 'turbodrop-photos-'));
  const photos = await makePhotos(tmp);
  const browser = await webkit.launch();
  const device = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };

  for (const lang of ['en', 'fa']) {
    // 1) Connected, idle.
    const host = await startCli(['share', ...photos, '--text', lang === 'fa' ? 'سلام! عکس‌های سفر 🌄 https://www.pouyam.com' : 'Trip photos 🌄 https://www.pouyam.com']);
    const ctx = await browser.newContext(device);
    const page = await ctx.newPage();
    await page.addInitScript((l) => localStorage.setItem('turbodrop.lang', l), lang);
    await page.goto(host.url);
    await page.getByRole('button', { name: lang === 'fa' ? 'ذخیرهٔ همه (ZIP)' : 'Save all (ZIP)' }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, `phone-receive${lang === 'fa' ? '-fa' : ''}.png`) });
    host.child.kill();
    await ctx.close();

    // 2) Sending a big file, frozen mid-way by slowing the network.
    const host2 = await startCli(['receive', '--yes']);
    const ctx2 = await browser.newContext(device);
    const page2 = await ctx2.newPage();
    await page2.addInitScript((l) => localStorage.setItem('turbodrop.lang', l), lang);
    await page2.goto(host2.url);
    await page2.waitForTimeout(800);
    await page2.screenshot({ path: join(OUT, `phone-home${lang === 'fa' ? '-fa' : ''}.png`) });
    await page2.route('**/api/v1/b/upload/**', async (r) => {
      await new Promise((s) => setTimeout(s, 350));
      r.continue();
    });
    const big = Buffer.alloc(40 * 1024 * 1024, 1);
    await page2.locator('input[type=file]:not([webkitdirectory])').setInputFiles([
      { name: 'IMG_4823.MOV', mimeType: 'video/quicktime', buffer: big },
      { name: 'IMG_4824.HEIC', mimeType: 'image/heic', buffer: Buffer.alloc(3 * 1024 * 1024, 2) },
    ]);
    await page2.waitForTimeout(2600);
    await page2.screenshot({ path: join(OUT, `phone-send${lang === 'fa' ? '-fa' : ''}.png`) });
    host2.child.kill();
    await ctx2.close();
  }
  await browser.close();
}

if (!only || only === 'desktop') await desktopShots();
if (!only || only === 'phone') await phoneShots();
console.log('screenshots in', OUT);
