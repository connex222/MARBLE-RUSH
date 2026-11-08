/* ==========================================================================
   MARBLE RUSH — build (Section 7.5)
   1. Processes art from assets/raw → public/assets (resize, WebP) + manifest
   2. Bakes fonts, engine and TV code into single self-contained HTML files
   Run:  npm run build
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PUB = path.join(ROOT, 'public');
const RAW = path.join(ROOT, 'assets', 'raw');
const OUT_IMG = path.join(PUB, 'assets', 'img');
const OUT_AUD = path.join(PUB, 'assets', 'audio');

let sharp = null;
try { sharp = require('sharp'); } catch (e) { console.log('• sharp not installed — images will be copied without resizing'); }

// Game sizes from Section 9 (longest edge or exact box)
const SIZES = [
  [/^logo_/, { w: 1200 }],
  [/^bg_phone$/, { w: 780, h: 1688, fit: 'cover' }],
  [/^bg_/, { w: 1920, h: 1080, fit: 'cover' }],
  [/^clatter_/, { box: 512 }],
  [/^marble_/, { w: 256, h: 256, fit: 'cover' }],
  [/^tex_rail_/, { w: 512, h: 512, fit: 'cover' }],
  [/^prop_/, { box: 512 }],
  [/^item_box$/, { box: 192 }],
  [/^item_/, { box: 256 }],
  [/^oil_puddle$/, { box: 300 }],
  [/^fx_(sparkle|spark|dust|sprinkle|frost)$/, { box: 128 }],
  [/^fx_spotlight$/, { box: 1000 }],
  [/^fx_wind$/, { box: 400 }],
  [/^fx_/, { box: 256 }],
  [/^bumper$/, { box: 192 }],
  [/^gate_start$/, { box: 800 }],
  [/^arch_finish$/, { box: 900 }],
  [/^trophy_/, { box: 512 }],
  [/^medal_/, { box: 256 }],
];
const sizeFor = k => (SIZES.find(([re]) => re.test(k)) || [null, { box: 512 }])[1];

async function processImages() {
  fs.mkdirSync(OUT_IMG, { recursive: true });
  const list = [];
  if (!fs.existsSync(RAW)) return list;
  for (const f of fs.readdirSync(RAW)) {
    const ext = path.extname(f).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue;
    const k = path.basename(f, ext).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const src = path.join(RAW, f);
    if (sharp) {
      const s = sizeFor(k);
      let img = sharp(src).ensureAlpha();
      if (!/^bg_|^tex_/.test(k)) img = img.trim({ threshold: 2 });
      if (s.fit === 'cover') img = img.resize(s.w, s.h, { fit: 'cover' });
      else if (s.box) img = img.resize(s.box, s.box, { fit: 'inside', withoutEnlargement: true });
      else img = img.resize({ width: s.w, withoutEnlargement: true });
      // keep a tiny transparent border so edges never clip
      if (!/^bg_|^tex_|^marble_/.test(k)) img = sharp(await img.png().toBuffer()).extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } });
      await img.webp({ quality: 86, alphaQuality: 90 }).toFile(path.join(OUT_IMG, k + '.webp'));
      list.push({ k, f: k + '.webp' });
    } else {
      fs.copyFileSync(src, path.join(OUT_IMG, k + ext));
      list.push({ k, f: k + ext });
    }
  }
  return list;
}
function processAudio() {
  fs.mkdirSync(OUT_AUD, { recursive: true });
  const list = [];
  const dir = path.join(RAW, 'audio');
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const ext = path.extname(f).toLowerCase();
    if (!['.mp3', '.ogg', '.m4a', '.wav'].includes(ext)) continue;
    const k = path.basename(f, ext).toLowerCase().replace(/[^a-z0-9_]/g, '_');
    fs.copyFileSync(path.join(dir, f), path.join(OUT_AUD, k + ext));
    list.push({ k, f: k + ext });
  }
  return list;
}

function fontCss(names) {
  return names.map(([fam, file, weights]) => {
    const p = path.join(ROOT, 'fonts', file);
    if (!fs.existsSync(p)) return '';
    const b64 = fs.readFileSync(p).toString('base64');
    return `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:${weights};font-display:block}`;
  }).join('\n');
}

(async () => {
  fs.mkdirSync(PUB, { recursive: true });
  const images = await processImages();
  const audio = processAudio();
  fs.writeFileSync(path.join(PUB, 'assets', 'manifest.json'), JSON.stringify({ images, audio }, null, 1));
  console.log(`• ${images.length} images, ${audio.length} sounds`);

  const fonts = fontCss([['Fredoka', 'fredoka.woff2', '300 700'], ['Nunito', 'nunito.woff2', '200 1000']]);
  const engine = fs.readFileSync(path.join(SRC, 'engine.js'), 'utf8');
  const tv = fs.readFileSync(path.join(SRC, 'tv.js'), 'utf8');
  const qr = fs.readFileSync(path.join(SRC, 'qr.js'), 'utf8');
  const safe = s => s.replace(/<\/script/gi, '<\\/script');
  let tvHtml = fs.readFileSync(path.join(SRC, 'tv.html'), 'utf8');
  tvHtml = tvHtml.replace('/*FONTS*/', () => fonts).replace('/*ENGINE*/', () => safe(engine)).replace('/*QR*/', () => safe(qr)).replace('/*TV*/', () => safe(tv));
  fs.writeFileSync(path.join(PUB, 'tv.html'), tvHtml);
  let play = fs.readFileSync(path.join(SRC, 'play.html'), 'utf8');
  play = play.replace('/*FONTS*/', () => fonts);
  fs.writeFileSync(path.join(PUB, 'play.html'), play);
  console.log(`• public/tv.html ${(tvHtml.length / 1024).toFixed(0)} KB, public/play.html ${(play.length / 1024).toFixed(0)} KB`);
})();
