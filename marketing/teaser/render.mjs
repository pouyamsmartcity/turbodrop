// node render.mjs <reel|youtube> <en|fa> [--stills 0.5,3.2,...]
// Renders every frame of scene.html at 30 fps into out/<format>-<lang>-silent.mp4 and writes the sound cues.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const DIR = dirname(fileURLToPath(import.meta.url));
let chromium;
({ chromium } = require('playwright'));
const qrcode = require('qrcode-generator');

const [format = 'reel', lang = 'en'] = process.argv.slice(2);
const stillsArg = process.argv.indexOf('--stills');
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;

function matrix(text) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => (q.isDark(y, x) ? '1' : '0')).join(''));
}
writeFileSync(join(DIR, 'qr.js'), `window.QR = ${JSON.stringify({ site: matrix('https://pouyamsmartcity.github.io/turbodrop/'), lan: matrix('http://192.168.1.20:47474/#k=demo') })};\n`);

const W = format === 'reel' ? 1080 : 1920;
const H = format === 'reel' ? 1920 : 1080;
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`file://${join(DIR, 'scene.html')}?format=${format}&lang=${lang}`);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
});
const info = await page.evaluate(() => ({ total: window.TEASER.TOTAL, cues: window.TEASER.CUES, scenes: window.TEASER.SCENES }));
const base = join(DIR, 'out', `${format}-${lang}`);
writeFileSync(`${base}-cues.json`, JSON.stringify(info, null, 1));

if (stills) {
  for (const t of stills) {
    await page.evaluate((tt) => window.ENGINE.render(tt), t);
    await page.screenshot({ path: `${base}-still-${t}.jpg`, type: 'jpeg', quality: 85 });
  }
  console.log(`stills: ${stills.length}`);
} else {
  const fps = 30;
  const frames = Math.round(info.total * fps);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}-silent.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate(([tt, fi]) => window.ENGINE.render(tt, fi), [i / fps, i]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`${format}-${lang}: frame ${i}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`${base}-silent.mp4`);
}
await browser.close();
