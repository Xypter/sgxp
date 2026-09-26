// One-off build tool, not part of `npm run build`. Pre-renders the theme scenery's
// animated GIFs (see src/lib/themeBackdrops.ts) into still images the compositor can
// animate without redrawing anything:
//
//  - Fly-by sprites (layers marked `flyby: true`): each GIF is a character on a
//    6000-12000px-wide, otherwise empty canvas. Every GIF frame change made the
//    browser redraw that whole strip. Here each becomes a sprite sheet - its frames
//    side by side, cropped to the character - that ThemeBackdrop.astro flips through
//    with transforms inside a character-sized box.
//  - Snow's falling pattern: its 9-frame twinkle redrew the whole screen (twice) 20
//    times a second, so it's frozen on its first frame. The flakes still fall.
//  - Doomsday Zone/ARK's two still star fields: merged into one image, so there's one
//    full-screen layer to draw under the moving scenery instead of two.
//
// Writes the images under public/themes/prerendered/ and the sprite data to
// src/lib/backdropSprites.ts. Rerun (`node scripts/generate-backdrop-sprites.mjs`)
// if one of these GIFs changes, and commit the output.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'public/themes/prerendered');
const DATA_FILE = path.join(projectRoot, 'src/lib/backdropSprites.ts');

const FLYBYS = [
  'https://cdn.sgxp.me/themes/ddz/eggmanboss.gif',
  'https://cdn.sgxp.me/themes/ddz/supersonic.gif',
  'https://cdn.sgxp.me/themes/hpz/sonic_run.gif',
  'https://cdn.sgxp.me/themes/hpz/boss.gif',
  'https://cdn.sgxp.me/themes/ssz/mecha_01.gif',
  'https://cdn.sgxp.me/themes/ssz/mecha_02.gif',
  'https://cdn.sgxp.me/themes/ssz/tornado_01.gif',
  'https://cdn.sgxp.me/themes/ssz/tornado_02.gif',
];
const FREEZE = ['https://cdn.sgxp.me/themes/snow/snow_pattern.gif'];
// Still layers of the same size, drawn in this order, flattened into one image.
const MERGE = {
  'ddz-stars.png': ['https://cdn.sgxp.me/themes/ddz/stars1.gif', 'https://cdn.sgxp.me/themes/ddz/stars2.gif'],
};

async function frames(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(input, { animated: true }).metadata();
  const { data, info } = await sharp(input, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = meta.pageHeight ?? info.height;
  const count = meta.pages ?? 1;
  const pages = Array.from({ length: count }, (_, i) => data.subarray(i * width * height * 4, (i + 1) * width * height * 4));
  // GIF delays of 0-10ms are played as 100ms by browsers.
  const delays = Array.from({ length: count }, (_, i) => ((meta.delay ?? [])[i] > 10 ? meta.delay[i] : 100));
  return { width, height, pages, delays };
}

const name = (url) => `${url.split('/').at(-2)}-${path.basename(url, '.gif')}`;
mkdirSync(OUT_DIR, { recursive: true });

const sprites = {};
for (const url of FLYBYS) {
  const { width, height, pages, delays } = await frames(url);
  // The character's box: every pixel any frame draws.
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (const page of pages) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (page[(y * width + x) * 4 + 3]) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
  }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const cells = await Promise.all(
    pages.map((page) => sharp(page, { raw: { width, height, channels: 4 } }).extract({ left: x0, top: y0, width: w, height: h }).png().toBuffer())
  );
  const file = `${name(url)}.png`;
  await sharp({ create: { width: w * pages.length, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(cells.map((input, i) => ({ input, left: i * w, top: 0 })))
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, file));
  sprites[url] = { sheet: `/themes/prerendered/${file}`, x: x0, y: y0, w, h, delays };
  console.log(`${file}: ${pages.length} frames of ${w}x${h} (from ${width}x${height}), delays ${[...new Set(delays)].join('/')}ms`);
}

const stills = {};
for (const url of FREEZE) {
  const { width, height, pages } = await frames(url);
  const file = `${name(url)}.png`;
  await sharp(pages[0], { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, file));
  stills[url] = `/themes/prerendered/${file}`;
  console.log(`${file}: first of ${pages.length} frames, ${width}x${height}`);
}

for (const [file, urls] of Object.entries(MERGE)) {
  const layers = await Promise.all(urls.map(frames));
  const { width, height } = layers[0];
  await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map((l) => ({ input: l.pages[0], raw: { width: l.width, height: l.height, channels: 4 } })))
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, file));
  console.log(`${file}: ${urls.length} layers merged, ${width}x${height}`);
}

writeFileSync(
  DATA_FILE,
  `// Generated by scripts/generate-backdrop-sprites.mjs - don't edit by hand.
// Fly-by sprite sheets: the GIF's frames side by side, each cropped to the
// character's box (x, y, w, h within the original GIF), shown for \`delays\` ms.
export interface BackdropSprite {
  sheet: string;
  x: number;
  y: number;
  w: number;
  h: number;
  delays: number[];
}

export const BACKDROP_SPRITES: Record<string, BackdropSprite> = ${JSON.stringify(sprites, null, 2)};

// Animated GIFs replaced by a single still frame.
export const BACKDROP_STILLS: Record<string, string> = ${JSON.stringify(stills, null, 2)};
`
);
console.log(`Wrote ${path.relative(projectRoot, DATA_FILE)}`);
