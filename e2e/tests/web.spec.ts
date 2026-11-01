import { expect, test } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pattern, startHost } from './host';

const MB = 1024 * 1024;

test('phone sends photos, a big video and a Persian-named note to the computer', async ({ page }) => {
  const host = await startHost(['receive', '--yes']);
  try {
    await page.goto(host.url);
    await expect(page.getByText('Connected to Test-PC')).toBeVisible();
    // The key must not stay in the address bar.
    expect(new URL(page.url()).hash).toBe('');

    const video = pattern(9 * MB + 321, 5);
    await page.locator('input[type=file]:not([webkitdirectory])').setInputFiles([
      { name: 'IMG_2026.MOV', mimeType: 'video/quicktime', buffer: video },
      { name: 'یادداشت سفر.txt', mimeType: 'text/plain', buffer: Buffer.from('سلام از آیفون') },
    ]);
    await expect(page.getByText('Sent', { exact: false }).first()).toBeVisible({ timeout: 60_000 });
    await host.waitFor((e) => e.type === 'transferUpdate' && e.transfer.status === 'done' && e.transfer.direction === 'in');

    expect(readFileSync(join(host.downloads, 'IMG_2026.MOV')).equals(video)).toBe(true);
    expect(readFileSync(join(host.downloads, 'یادداشت سفر.txt'), 'utf8')).toBe('سلام از آیفون');
  } finally {
    host.stop();
  }
});

test('phone sends a text message', async ({ page }) => {
  const host = await startHost(['receive', '--yes']);
  try {
    await page.goto(host.url);
    await expect(page.getByText('Connected to Test-PC')).toBeVisible();
    await page.getByRole('button', { name: 'Send text' }).click();
    await page.getByRole('textbox').fill('https://www.pouyam.com — سلام');
    await page.getByRole('dialog').getByRole('button', { name: 'Send' }).click();
    const ev = await host.waitFor((e) => e.type === 'textReceived');
    expect(ev.text).toBe('https://www.pouyam.com — سلام');
  } finally {
    host.stop();
  }
});

test('upload survives a dropped connection and resumes', async ({ page }) => {
  const host = await startHost(['receive', '--yes']);
  try {
    await page.goto(host.url);
    await expect(page.getByText('Connected to Test-PC')).toBeVisible();

    // Kill the second chunk's requests for a few seconds, like walking out of Wi-Fi range.
    let blocked = 0;
    const until = { t: 0 };
    await page.route('**/api/v1/b/upload/**', (route) => {
      const i = new URL(route.request().url()).searchParams.get('i');
      if (i === '1' && (until.t === 0 || Date.now() < until.t)) {
        if (until.t === 0) until.t = Date.now() + 3500;
        blocked++;
        return route.abort('internetdisconnected');
      }
      return route.continue();
    });
    const data = pattern(12 * MB + 7, 9);
    await page.locator('input[type=file]:not([webkitdirectory])').setInputFiles([{ name: 'big.bin', mimeType: 'application/octet-stream', buffer: data }]);
    await expect(page.getByText('Connection lost', { exact: false })).toBeVisible();
    await host.waitFor((e) => e.type === 'transferUpdate' && e.transfer.status === 'done', 60_000);
    expect(blocked).toBeGreaterThan(0);
    expect(readFileSync(join(host.downloads, 'big.bin')).equals(data)).toBe(true);
    expect(statSync(join(host.downloads, 'big.bin')).size).toBe(data.length);
  } finally {
    host.stop();
  }
});

test('computer sends files and a link to the phone; phone saves all as ZIP', async ({ page }, testInfo) => {
  const dir = testInfo.outputPath('share');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(dir, { recursive: true });
  const photo = pattern(5 * MB + 11, 3);
  writeFileSync(join(dir, 'photo.jpg'), photo);
  writeFileSync(join(dir, 'notes.txt'), 'hello phone');
  const host = await startHost(['share', join(dir, 'photo.jpg'), join(dir, 'notes.txt'), '--text', 'Here you go https://www.pouyam.com']);
  try {
    await page.goto(host.url);
    await expect(page.getByText('From Test-PC')).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://www.pouyam.com' })).toBeVisible();
    const saveAll = page.getByRole('button', { name: 'Save all (ZIP)' });
    await expect(saveAll).toBeVisible({ timeout: 60_000 });
    await host.waitFor((e) => e.type === 'transferUpdate' && e.transfer.direction === 'out' && e.transfer.status === 'done');

    const [download] = await Promise.all([page.waitForEvent('download'), saveAll.click()]);
    const zip = readFileSync(await download.path());
    const files = readStoredZip(zip);
    expect(Object.keys(files).sort()).toEqual(['notes.txt', 'photo.jpg']);
    expect(files['photo.jpg'].equals(photo)).toBe(true);
    expect(files['notes.txt'].toString()).toBe('hello phone');
  } finally {
    host.stop();
  }
});

test('Persian interface switches to right-to-left', async ({ page }) => {
  const host = await startHost(['receive', '--yes']);
  try {
    await page.goto(host.url);
    await page.getByLabel('Language').selectOption('fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'ارسال فایل' })).toBeVisible();
    // The choice sticks across reloads.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  } finally {
    host.stop();
  }
});

test('without a QR key the page explains how to connect', async ({ page }) => {
  const host = await startHost(['receive', '--yes']);
  try {
    await page.goto(`http://127.0.0.1:${host.port}/`);
    await expect(page.getByRole('heading', { name: 'Scan the QR code' })).toBeVisible();
  } finally {
    host.stop();
  }
});

/** Read our stored (uncompressed) ZIP. */
function readStoredZip(buf: Buffer): Record<string, Buffer> {
  const eocd = buf.length - 22;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: Record<string, Buffer> = {};
  for (let i = 0; i < count; i++) {
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const lnameLen = buf.readUInt16LE(local + 26);
    out[name] = buf.subarray(local + 30 + lnameLen, local + 30 + lnameLen + size);
    p += 46 + nameLen;
  }
  return out;
}
