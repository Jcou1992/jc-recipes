// One-off SEKAI app-icon generator. Not part of the build — run manually:
//   node scripts/gen-icons.mjs
//
// Renders the icon with headless Chromium (Playwright, already a devDep) so the
// Noto Serif JP kanji 世界 rasterize correctly, then sharp downsizes to every
// target. Output PNGs land in public/ and are served at the site root by the
// Cloudflare worker (.open-next/assets). favicon.ico is hand-wrapped around a
// 32px PNG (ICO supports embedded PNG since Vista) to avoid any extra dependency.
//
// Design: full-bleed ink (#1a1a1d) square, 世界 in gold (#EDD18E) centered, four
// faint terracotta (#D4703F) corner dots. Full-bleed (no own rounding/transparency)
// so iOS/Android apply their own mask cleanly. Maskable variant insets content to
// the central 80% safe zone and drops the corner dots.

import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const INK = '#1a1a1d';
const GOLD = '#EDD18E';
const TERRACOTTA = '#D4703F';
const S = 512; // master render size

function html({ maskable }) {
  const fontPx = maskable ? 150 : 184;       // smaller for maskable safe zone
  const dots = maskable
    ? '' // omit — would sit outside the masked area
    : [
        ['top:9%;left:9%'], ['top:9%;right:9%'],
        ['bottom:9%;left:9%'], ['bottom:9%;right:9%'],
      ].map(([pos]) => `<i style="${pos}"></i>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@600&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  .tile{width:${S}px;height:${S}px;background:${INK};position:relative;
        display:flex;align-items:center;justify-content:center;overflow:hidden}
  .kanji{font-family:'Noto Serif JP',serif;font-weight:600;color:${GOLD};
         font-size:${fontPx}px;line-height:1;letter-spacing:${maskable ? 6 : 10}px;
         text-indent:${maskable ? 6 : 10}px}
  .tile i{position:absolute;width:16px;height:16px;border-radius:50%;
          background:${TERRACOTTA};opacity:.55}
</style></head>
<body><div class="tile"><span class="kanji">世界</span>${dots}</div></body></html>`;
}

async function render(page, opts) {
  await page.setViewportSize({ width: S, height: S });
  await page.setContent(html(opts), { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.load("600 184px 'Noto Serif JP'");
    await document.fonts.ready;
  });
  await page.waitForTimeout(150);
  return page.screenshot({ clip: { x: 0, y: 0, width: S, height: S } });
}

function pngToIco(pngBuf) {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0); entry.writeUInt8(32, 1); // 32x32
  entry.writeUInt8(0, 2); entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(22, 12); // offset = 6 + 16
  return Buffer.concat([dir, entry, pngBuf]);
}

(async () => {
  mkdirSync('public', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  const std = await render(page, { maskable: false });
  const mask = await render(page, { maskable: true });
  await browser.close();

  const jobs = [
    [std, 512, 'public/icon.png'],
    [std, 512, 'public/icon-512.png'],
    [std, 192, 'public/icon-192.png'],
    [std, 180, 'public/apple-icon.png'],
    [mask, 512, 'public/icon-maskable-512.png'],
    [mask, 192, 'public/icon-maskable-192.png'],
  ];
  for (const [buf, size, out] of jobs) {
    await sharp(buf).resize(size, size).png().toFile(out);
    console.log('wrote', out, `${size}x${size}`);
  }

  const favPng = await sharp(std).resize(32, 32).png().toBuffer();
  writeFileSync('public/favicon.ico', pngToIco(favPng));
  console.log('wrote public/favicon.ico 32x32');
})();
