// One-off build tool, not part of `npm run build`. Renders the /sprites page's
// desktop "SPRITES" logo and writes it as two alpha masks at 1x and 2x:
//
//   public/img/sprites-logo-light-{1x,2x}.png - the logo's white parts
//   public/img/sprites-logo-dark-{1x,2x}.png  - the logo's black parts
//
// SpriteBrowser.svelte paints them in the theme's colors (.sprites-logo). The
// logo used to be a live three.js scene (Logo3D.svelte) whose rAF loop forced a
// main-thread frame 60 times a second on every visit; this is a still of the
// same extruded text: same font, size, depth, tilt and camera, letters spaced
// slightly apart, 2px white edges, and a 2px black then 2px white ring around
// the outside so it reads on light and dark backgrounds alike.
//
// Rerun (`node scripts/generate-sprites-logo.mjs`) after changing anything
// below and commit the four PNGs. Needs Google Chrome installed (renders with
// WebGL through puppeteer-core).
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';
import * as THREE from 'three';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'public/img');

const TEXT = 'SPRITES';
const FONT_PATH = path.join(projectRoot, 'public/fonts/Starbirl.otf');
const GEOMETRY_OPTIONS = { size: 6.5, depth: 20, curveSegments: 4, bevelEnabled: false };
const LETTER_SPACING = 0.5; // extra gap between letters, in the text's own units
const EDGE_WIDTH = 2; // white edge lines, CSS px
const RING_BLACK = 2; // black ring around the outside, CSS px
const RING_WHITE = 2; // white ring outside that, CSS px
const PADDING = 24; // transparent space left and right, CSS px

// The old Logo3D camera and tilt. The canvas only needs to be wider than the logo.
const CSS_W = 1400;
const CSS_H = 200;
const SS = 4; // supersampling: render at 4 device px per CSS px, then box-filter down

// --- Geometry: one mesh per letter so they can be spaced apart.
const ttf = readFileSync(FONT_PATH);
const font = new FontLoader().parse(new TTFLoader().parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength)));
const unitsPerFontUnit = GEOMETRY_OPTIONS.size / font.data.resolution;
const letters = [];
let penX = 0;
for (const ch of TEXT) {
  const geometry = new TextGeometry(ch, { font, ...GEOMETRY_OPTIONS });
  geometry.translate(penX, 0, 0);
  letters.push(geometry);
  penX += font.data.glyphs[ch].ha * unitsPerFontUnit + LETTER_SPACING;
}
const bounds = new THREE.Box3();
for (const geometry of letters) {
  geometry.computeBoundingBox();
  bounds.union(geometry.boundingBox);
}
const shiftX = -0.5 * (bounds.max.x - bounds.min.x);
const shiftY = -0.5 * (bounds.max.y - bounds.min.y);
// Plain BufferGeometry copies serialize their vertex data (TextGeometry would
// serialize its constructor inputs instead).
const toJson = (geometry) => new THREE.BufferGeometry().copy(geometry).toJSON();
const letterJson = letters.map((geometry) => {
  geometry.translate(shiftX, shiftY, 0);
  return { main: toJson(geometry), edges: toJson(new THREE.EdgesGeometry(geometry)) };
});

// --- Render the faces and the visible edges separately in headless Chrome.
const page = `<!doctype html><html><body style="margin:0;background:transparent">
<canvas id="c" style="width:${CSS_W}px;height:${CSS_H}px"></canvas>
<script type="module">
  import * as THREE from '/three.module.js';
  const letters = ${JSON.stringify(letterJson)};
  const loader = new THREE.BufferGeometryLoader();
  const canvas = document.getElementById('c');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(10, ${CSS_W} / ${CSS_H}, 0.1, 1000);
  camera.position.z = 100;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(${SS});
  renderer.setSize(${CSS_W}, ${CSS_H}, false);
  // Faces are pushed back a hair so edges lying exactly on them win the depth test.
  const faces = [0xffffff, 0x000000].map((color) => new THREE.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const group = new THREE.Group();
  group.rotation.x = -0.25;
  group.position.y = -3;
  const lines = [];
  for (const letter of letters) {
    const mesh = new THREE.Mesh(loader.parse(letter.main), faces);
    const edges = new THREE.LineSegments(loader.parse(letter.edges), lineMaterial);
    mesh.add(edges);
    lines.push(edges);
    group.add(mesh);
  }
  scene.add(group);
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const ctx = copy.getContext('2d', { willReadFrequently: true });
  // 'faces': the solid text. 'edges': only the edges that aren't hidden behind it.
  window.grab = (mode) => {
    faces.forEach((m) => { m.colorWrite = mode === 'faces'; m.needsUpdate = true; });
    lines.forEach((l) => { l.visible = mode === 'edges'; });
    renderer.render(scene, camera);
    ctx.clearRect(0, 0, copy.width, copy.height);
    ctx.drawImage(canvas, 0, 0);
    return Array.from(ctx.getImageData(0, 0, copy.width, copy.height).data);
  };
  window.size = { w: canvas.width, h: canvas.height };
</script></body></html>`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/three.module.js' || url === '/three.core.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(readFileSync(path.join(projectRoot, 'node_modules/three/build', url)));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(page);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const browser = await puppeteer.launch({ channel: 'chrome', headless: true, args: ['--ignore-gpu-blocklist'] });
let w, h, faces, edges;
try {
  const tab = await browser.newPage();
  await tab.setViewport({ width: CSS_W, height: CSS_H, deviceScaleFactor: SS });
  tab.on('pageerror', (err) => console.error('[page]', err.message));
  await tab.goto(`http://127.0.0.1:${server.address().port}/`);
  await tab.waitForFunction('window.size', { timeout: 20000 });
  ({ w, h } = await tab.evaluate(() => window.size));
  faces = Uint8ClampedArray.from(await tab.evaluate(() => window.grab('faces')));
  edges = Uint8ClampedArray.from(await tab.evaluate(() => window.grab('edges')));
} finally {
  await browser.close();
  server.close();
}

// --- Outline and rings, at 4x. The GPU only draws 1px lines, so thick lines
// are made here by stamping disks.
const N = w * h;
function distanceFrom(seeds, maxR) {
  const dist = new Float32Array(N).fill(Infinity);
  const R = Math.ceil(maxR);
  for (const i of seeds) {
    const x0 = i % w;
    const y0 = (i / w) | 0;
    for (let dy = -R; dy <= R; dy++) {
      const y = y0 + dy;
      if (y < 0 || y >= h) continue;
      for (let dx = -R; dx <= R; dx++) {
        const x = x0 + dx;
        if (x < 0 || x >= w) continue;
        const d = Math.hypot(dx, dy);
        const j = y * w + x;
        if (d <= maxR && d < dist[j]) dist[j] = d;
      }
    }
  }
  return dist;
}
const setPixel = (buf, i, v) => { buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = v; buf[i * 4 + 3] = 255; };

const out = new Uint8ClampedArray(faces);
const edgeSeeds = [];
for (let i = 0; i < N; i++) if (edges[i * 4 + 3]) edgeSeeds.push(i);
const edgeRadius = (EDGE_WIDTH * SS) / 2;
const edgeDist = distanceFrom(edgeSeeds, edgeRadius);
const inLogo = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  if (edgeDist[i] <= edgeRadius - 0.5) setPixel(out, i, 255);
  if (out[i * 4 + 3]) inLogo[i] = 1;
}

const boundary = [];
for (let i = 0; i < N; i++) {
  if (!inLogo[i]) continue;
  const x = i % w;
  const y = (i / w) | 0;
  if ((x > 0 && !inLogo[i - 1]) || (x < w - 1 && !inLogo[i + 1]) || (y > 0 && !inLogo[i - w]) || (y < h - 1 && !inLogo[i + w])) boundary.push(i);
}
const blackEdge = RING_BLACK * SS;
const whiteEdge = (RING_BLACK + RING_WHITE) * SS;
const ringDist = distanceFrom(boundary, whiteEdge);
let maxHalf = 0;
const cx = w / 2;
for (let i = 0; i < N; i++) {
  if (!inLogo[i]) {
    if (!(ringDist[i] <= whiteEdge)) continue;
    setPixel(out, i, ringDist[i] <= blackEdge ? 0 : 255);
  }
  maxHalf = Math.max(maxHalf, Math.abs((i % w) + 0.5 - cx));
}

// Crop symmetrically about the center, so the logo stays centered in its box.
const halfCss = Math.ceil(maxHalf / SS + PADDING);
const left = Math.round(cx - halfCss * SS);
const cropW = halfCss * 2 * SS;
if (left < 0) throw new Error(`Logo is wider than the ${CSS_W}px render canvas - raise CSS_W`);
const full = await sharp(Buffer.from(out.buffer), { raw: { width: w, height: h, channels: 4 } })
  .extract({ left, top: 0, width: cropW, height: h })
  .raw()
  .toBuffer();

// --- Downsample (exact box filter, premultiplied) and split into the two masks.
// Stacked dark-then-light, the masks composite back to exactly
// bg * (1 - a) + a * (lum * light + (1 - lum) * dark) for every pixel.
for (const scale of [1, 2]) {
  const k = SS / scale;
  const W = cropW / k;
  const H = h / k;
  const light = Buffer.alloc(W * H * 4, 255);
  const dark = Buffer.alloc(W * H * 4, 255);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let lumSum = 0;
      let alphaSum = 0;
      for (let sy = 0; sy < k; sy++) {
        for (let sx = 0; sx < k; sx++) {
          const s = ((y * k + sy) * cropW + (x * k + sx)) * 4;
          lumSum += full[s] * full[s + 3];
          alphaSum += full[s + 3];
        }
      }
      // Round through 8 bits like a saved RGBA PNG would, so masks match the approved render.
      const a = Math.round(alphaSum / (k * k)) / 255;
      const lum = alphaSum ? Math.round(lumSum / alphaSum) / 255 : 0;
      const aLight = a * lum;
      const aDark = aLight >= 1 ? 0 : (a * (1 - lum)) / (1 - aLight);
      const d = (y * W + x) * 4;
      light[d + 3] = Math.round(aLight * 255);
      dark[d + 3] = Math.round(aDark * 255);
    }
  }
  for (const [part, buf] of [['light', light], ['dark', dark]]) {
    const file = path.join(OUT_DIR, `sprites-logo-${part}-${scale}x.png`);
    await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
    console.log(`Wrote ${path.relative(projectRoot, file)} (${W}x${H}, ${(statSync(file).size / 1024).toFixed(1)} KB)`);
  }
}
