// Original Encore placeholder art. PNG encoder: patch-gg/pixelfx@5294518ce7c72e48b6100a744596e0acf57f2826 (MIT).
// Run: node tools/encore-art/build.mjs. No packages, network or image services.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { encodePNG } from './png.mjs';
const directory = resolve('public/art/encore/cards');
mkdirSync(directory, { recursive: true });
const C = {
  ink: '#22283d',
  shadow: '#3b3656',
  cream: '#f1dfb6',
  skin: '#dca47c',
  skinDark: '#a86751',
  red: '#cb6656',
  redDark: '#8e4456',
  blue: '#558b99',
  blueDark: '#34546e',
  gold: '#d5ad62',
  purple: '#9276ad',
  white: '#eee9d4',
};
const sprites = [];
function canvas() {
  const rgba = new Uint8Array(32 * 40 * 4);
  const colors = new Set();
  const pixel = (x, y, color) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= 32 || y < 0 || y >= 40) return;
    const c = color.replace('#', '');
    const n = (y * 32 + x) * 4;
    rgba[n] = parseInt(c.slice(0, 2), 16);
    rgba[n + 1] = parseInt(c.slice(2, 4), 16);
    rgba[n + 2] = parseInt(c.slice(4, 6), 16);
    rgba[n + 3] = 255;
    colors.add(color);
  };
  const rect = (x, y, w, h, c) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) pixel(i, j, c);
  };
  const line = (x, y, a, b, c, w = 1) => {
    const n = Math.max(Math.abs(a - x), Math.abs(b - y));
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0;
      rect(Math.round(x + (a - x) * t), Math.round(y + (b - y) * t), w, w, c);
    }
  };
  const disc = (x, y, r, c) => {
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) pixel(x + i, y + j, c);
  };
  return { rgba, pixel, rect, line, disc, colors };
}
function person(kind) {
  const b = canvas(),
    { rect: r, line: l, disc: d, pixel: p } = b;
  const coat =
    kind === 'singer'
      ? C.purple
      : kind === 'drummer'
        ? C.blue
        : kind === 'bassist'
          ? C.gold
          : kind === 'keys'
            ? C.red
            : C.red;
  if (kind === 'conductor') {
    for (let y = 17; y < 36; y++) {
      const spread = Math.floor((y - 17) / 3);
      r(10 - spread, y, 12 + spread * 2, 1, C.gold);
    }
  }
  r(10, 29, 5, 8, C.ink);
  r(20, 29, 5, 8, C.ink);
  r(11, 28, 3, 6, C.blueDark);
  r(21, 28, 3, 6, C.blueDark);
  r(7, 36, 8, 3, C.ink);
  r(20, 36, 9, 3, C.ink);
  r(9, 16, 15, 14, C.ink);
  r(11, 17, 11, 12, coat);
  r(11, 17, 3, 12, kind === 'drummer' ? C.blueDark : C.redDark);
  r(7, 17, 4, 11, C.ink);
  r(23, 17, 4, 11, C.ink);
  r(8, 18, 3, 8, coat);
  r(23, 18, 3, 7, coat);
  r(8, 26, 3, 3, C.skin);
  r(23, 25, 3, 3, C.skin);
  r(14, 13, 6, 5, C.skinDark);
  r(10, 4, 13, 11, C.ink);
  r(12, 6, 9, 9, C.skin);
  r(12, 10, 2, 5, C.skinDark);
  r(14, 10, 1, 1, C.ink);
  r(19, 10, 1, 1, C.ink);
  r(16, 13, 3, 1, C.ink);
  r(10, 4, 13, 3, C.shadow);
  r(10, 6, 2, 4, C.shadow);
  if (kind === 'guitarist' || kind === 'bassist') {
    r(10, 2, 3, 5, C.ink);
    r(15, 1, 3, 5, C.ink);
    r(21, 2, 3, 5, C.ink);
    d(15, 28, 7, C.ink);
    d(15, 28, 6, kind === 'bassist' ? C.blue : C.gold);
    d(20, 23, 4, C.ink);
    d(20, 23, 3, kind === 'bassist' ? C.blue : C.gold);
    l(18, 26, 28, 7, C.ink, 3);
    l(19, 26, 29, 7, C.cream);
    r(27, 4, 4, 6, C.ink);
    r(28, 5, 2, 3, coat);
    r(10, 28, 5, 2, C.ink);
    r(20, 23, 3, 3, C.skin);
    p(13, 25, C.cream);
  }
  if (kind === 'singer') {
    d(16, 4, 8, C.ink);
    d(16, 3, 6, C.shadow);
    r(12, 7, 10, 8, C.skin);
    p(14, 10, C.ink);
    p(20, 10, C.ink);
    r(17, 13, 3, 1, C.ink);
    l(25, 16, 25, 36, C.ink);
    l(19, 38, 25, 35, C.ink);
    l(25, 35, 30, 38, C.ink);
    d(25, 14, 3, C.ink);
    r(24, 12, 3, 4, C.cream);
    r(23, 18, 4, 3, C.skin);
    l(8, 22, 4, 17, C.skin, 2);
  }
  if (kind === 'drummer') {
    r(8, 6, 17, 3, C.ink);
    r(11, 3, 11, 4, C.cream);
    l(9, 21, 3, 10, C.ink, 2);
    l(10, 20, 4, 9, C.cream);
    l(24, 21, 29, 10, C.ink, 2);
    l(23, 20, 28, 9, C.cream);
    d(16, 29, 8, C.ink);
    d(16, 29, 7, C.red);
    d(16, 29, 5, C.cream);
    l(13, 31, 16, 26, C.ink);
    l(16, 26, 19, 31, C.ink);
    r(2, 22, 8, 2, C.gold);
    r(24, 22, 7, 2, C.gold);
  }
  if (kind === 'keys') {
    r(10, 3, 4, 4, C.gold);
    r(17, 2, 4, 5, C.gold);
    r(7, 23, 21, 8, C.ink);
    r(8, 24, 19, 6, C.blue);
    r(9, 26, 17, 3, C.cream);
    for (let x = 11; x < 26; x += 3) r(x, 26, 1, 3, C.ink);
    r(9, 22, 3, 3, C.skin);
    r(23, 22, 3, 3, C.skin);
  }
  if (kind === 'conductor') {
    r(9, 1, 15, 5, C.ink);
    r(8, 6, 17, 2, C.ink);
    r(11, 4, 11, 2, C.gold);
    r(11, 17, 11, 13, C.blueDark);
    l(12, 17, 16, 23, C.gold, 2);
    l(21, 17, 17, 23, C.gold, 2);
    l(25, 24, 30, 10, C.ink, 2);
    l(25, 23, 30, 9, C.cream);
    r(23, 24, 3, 3, C.skin);
  }
  return b;
}
function icon(kind) {
  const b = canvas(),
    { rect: r, line: l, disc: d } = b;
  if (kind === 'crew-riff') {
    l(8, 30, 24, 10, C.ink, 3);
    l(9, 30, 25, 10, C.gold);
    d(10, 28, 7, C.ink);
    d(10, 28, 5, C.red);
    r(23, 6, 5, 6, C.ink);
    r(24, 7, 3, 3, C.gold);
    r(6, 28, 5, 2, C.ink);
    l(3, 12, 7, 9, C.gold);
    l(3, 18, 7, 17, C.gold);
  } else if (kind === 'crew-roadie') {
    r(4, 13, 24, 21, C.ink);
    r(6, 15, 20, 17, C.blueDark);
    r(6, 17, 20, 2, C.cream);
    r(6, 28, 20, 2, C.cream);
    r(11, 9, 10, 5, C.ink);
    r(13, 11, 6, 3, C.cream);
    r(8, 33, 4, 4, C.ink);
    r(21, 33, 4, 4, C.ink);
    r(15, 21, 3, 4, C.gold);
  } else if (kind === 'crew-call') {
    r(9, 3, 19, 34, C.ink);
    r(11, 5, 15, 30, C.blueDark);
    r(13, 7, 11, 8, C.cream);
    for (let y = 19; y <= 28; y += 4) for (let x = 14; x <= 22; x += 4) r(x, y, 2, 2, C.gold);
    r(3, 9, 5, 20, C.ink);
    r(3, 8, 8, 5, C.red);
    r(3, 25, 8, 5, C.red);
    l(5, 30, 9, 35, C.ink);
  } else if (kind === 'gear-kit') {
    r(4, 18, 24, 15, C.ink);
    r(6, 20, 20, 11, C.red);
    r(6, 23, 20, 2, C.cream);
    l(6, 34, 9, 30, C.ink);
    l(25, 34, 22, 30, C.ink);
    l(7, 16, 26, 7, C.gold, 2);
    l(23, 16, 6, 7, C.cream, 2);
  } else if (kind === 'gear-mic') {
    l(16, 15, 16, 35, C.ink, 2);
    l(9, 37, 17, 33, C.ink);
    l(17, 33, 25, 37, C.ink);
    d(17, 10, 6, C.ink);
    d(17, 9, 4, C.cream);
    r(13, 8, 8, 1, C.blueDark);
    r(13, 11, 8, 1, C.blueDark);
  } else {
    r(5, 8, 23, 28, C.ink);
    r(7, 10, 19, 24, kind === 'gear-rig' ? C.purple : C.blueDark);
    r(8, 11, 17, 4, C.gold);
    d(16, 25, 7, C.ink);
    d(16, 25, 5, C.shadow);
    d(16, 25, 2, C.cream);
    for (let x = 10; x < 24; x += 4) r(x, 12, 2, 2, C.ink);
    if (kind === 'gear-rig') {
      r(8, 2, 17, 6, C.ink);
      r(10, 3, 13, 3, C.gold);
    }
  }
  return b;
}
const keys = [
  'guitarist',
  'singer',
  'drummer',
  'bassist',
  'keys',
  'conductor',
  'crew-riff',
  'crew-roadie',
  'crew-call',
  'gear-amp',
  'gear-kit',
  'gear-mic',
  'gear-rig',
];
for (const key of keys) {
  const b = key.startsWith('crew-') || key.startsWith('gear-') ? icon(key) : person(key);
  const bytes = encodePNG(32, 40, b.rgba);
  writeFileSync(resolve(directory, key + '.png'), bytes);
  sprites.push({ key, pixels: b.rgba, colors: b.colors.size, bytes: bytes.length });
}
const scale = 4,
  cols = 5,
  cellW = 144,
  cellH = 176,
  rows = Math.ceil(sprites.length / cols),
  w = cols * cellW,
  h = rows * cellH,
  rgba = new Uint8Array(w * h * 4);
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    rgba.set([27, 33, 46, 255], o);
  }
for (let n = 0; n < sprites.length; n++) {
  const ox = (n % cols) * cellW + 8,
    oy = Math.floor(n / cols) * cellH + 8;
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 32; x++) {
      const src = (y * 32 + x) * 4;
      if (!sprites[n].pixels[src + 3]) continue;
      for (let j = 0; j < scale; j++)
        for (let i = 0; i < scale; i++)
          rgba.set(
            sprites[n].pixels.subarray(src, src + 4),
            ((oy + y * scale + j) * w + ox + x * scale + i) * 4,
          );
    }
}
const evidence = resolve(process.argv[2] ?? '/tmp/encore-art-preview');
mkdirSync(evidence, { recursive: true });
writeFileSync(resolve(evidence, 'card-art-contact.png'), encodePNG(w, h, rgba));
writeFileSync(
  resolve(evidence, 'card-art-metadata.json'),
  JSON.stringify(
    sprites.map(({ pixels, ...s }) => s),
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    sprites: sprites.length,
    nativeSize: '32x40',
    scale,
    bytes: sprites.reduce((n, s) => n + s.bytes, 0),
    maxColors: Math.max(...sprites.map((s) => s.colors)),
  }),
);
