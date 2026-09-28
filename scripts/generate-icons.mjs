// Gera a versão transparente da logo e os ícones PWA a partir de design/j1_logo.png.
// Remoção do fundo claro preservando a geometria, o gradiente e as cores do símbolo original.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'design/j1_logo.png';
mkdirSync('public/icons', { recursive: true });

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

// Cor de fundo: média dos quatro cantos.
const px = (x, y) => { const i = (y * width + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const corners = [px(4, 4), px(width - 5, 4), px(4, height - 5), px(width - 5, height - 5)];
const bg = [0, 1, 2].map((c) => corners.reduce((s, p) => s + p[c], 0) / corners.length);
console.log('fundo detectado', bg.map((v) => v.toFixed(1)));

// Pixels com diferença >= OPAQUE em relação ao fundo são interiores do símbolo: mantêm a
// cor original, totalmente opacos. Abaixo disso (borda suavizada), a transparência é
// proporcional e a cor é descontaminada do fundo.
const NOISE = 0.03;
const OPAQUE = 0.3;
const out = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 4) {
  let d = 0;
  for (let c = 0; c < 3; c++) d = Math.max(d, (bg[c] - data[i + c]) / bg[c]);
  const a = d <= NOISE ? 0 : Math.min(1, (d - NOISE) / (OPAQUE - NOISE));
  for (let c = 0; c < 3; c++) {
    const v = a >= 1 ? data[i + c] : a > 0 ? (data[i + c] - bg[c] * (1 - a)) / a : 0;
    out[i + c] = Math.max(0, Math.min(255, Math.round(v)));
  }
  out[i + 3] = Math.round(a * 255);
}

const transparent = sharp(out, { raw: { width, height, channels: 4 } }).png();
const trimmedBuf = await transparent.toBuffer();
const trimmed = await sharp(trimmedBuf).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
console.log('símbolo recortado', trimmed.info.width, 'x', trimmed.info.height);

await sharp(trimmed.data).resize({ height: 256 }).png({ compressionLevel: 9 }).toFile('public/logo.png');

async function icon(size, scale, file, background = { r: 255, g: 255, b: 255, alpha: 1 }) {
  const inner = Math.round(size * scale);
  const symbol = await sharp(trimmed.data).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: symbol, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(file);
}

await icon(192, 0.7, 'public/icons/icon-192.png');
await icon(512, 0.7, 'public/icons/icon-512.png');
await icon(512, 0.56, 'public/icons/maskable-512.png');
await icon(180, 0.72, 'public/icons/apple-touch-icon.png');
await icon(64, 0.9, 'public/icons/favicon-64.png', { r: 0, g: 0, b: 0, alpha: 0 });
await icon(32, 0.94, 'public/icons/favicon-32.png', { r: 0, g: 0, b: 0, alpha: 0 });
console.log('ícones gerados');
