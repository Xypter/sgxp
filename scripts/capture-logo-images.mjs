// One-off build tool, not part of `npm run build`. Companion to
// generate-logo-geometry.mjs: that script pre-builds the 3D geometry; this one
// renders that geometry with an actual (headless) WebGL context ONE TIME and
// saves the pixels as two static PNGs, so Logo3D.svelte can be plain HTML/CSS
// at runtime instead of running Three.js continuously in every visitor's browser.
//
// Produces:
//  - public/img/sprites-logo-base.png  - the solid extruded text, flat lit (no
//    outline), exactly as Logo3D used to render it every frame.
//  - public/img/sprites-logo-mask.png  - ONLY the traveling-outline edges, drawn
//    solid white on a transparent background. Used as a CSS mask-image so a
//    plain animated CSS gradient can fake the shader's traveling rainbow.
//
// Rerun (`node scripts/capture-logo-images.mjs`) any time
// public/models/sprites-logo.json is regenerated (new text/font/depth), and
// commit the two output PNGs.
import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const GEOMETRY_PATH = path.join(projectRoot, 'public/models/sprites-logo.json');
const THREE_BUILD_DIR = path.join(projectRoot, 'node_modules/three/build');
const OUT_BASE = path.join(projectRoot, 'public/img/sprites-logo-base.png');
const OUT_MASK = path.join(projectRoot, 'public/img/sprites-logo-mask.png');
const harnessDir = path.join(projectRoot, 'scripts/.capture-tmp');

// Matches Logo3D.svelte's create3DText() transforms at its reference (1.0 scale) width.
const REFERENCE_WIDTH = 900; // LOGO_SCALE_REFERENCE_WIDTH in Logo3D.svelte
const REFERENCE_HEIGHT = 200; // .three-container's fixed height
const PIXEL_RATIO = 2; // matches Math.min(devicePixelRatio, 2) in the old runtime code
const MESH_ROTATION_X = -0.25;
const MESH_POSITION_Y = -3;

const geometryJson = JSON.parse(readFileSync(GEOMETRY_PATH, 'utf8'));

function harnessHtml({ mode }) {
  // mode: 'base' (solid text, no outline) or 'mask' (outline only, solid white)
  return `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;background:transparent;">
<canvas id="c" width="${REFERENCE_WIDTH * PIXEL_RATIO}" height="${REFERENCE_HEIGHT * PIXEL_RATIO}"
        style="width:${REFERENCE_WIDTH}px;height:${REFERENCE_HEIGHT}px;"></canvas>
<script type="module">
  import * as THREE from './three.module.js';

  const geometryJson = ${JSON.stringify(geometryJson)};
  const loader = new THREE.BufferGeometryLoader();
  const geometry = loader.parse(geometryJson.main);
  const edgesGeometry = loader.parse(geometryJson.edges);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(10, ${REFERENCE_WIDTH} / ${REFERENCE_HEIGHT}, 0.1, 1000);
  camera.position.z = 100;

  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(${REFERENCE_WIDTH}, ${REFERENCE_HEIGHT}, false);
  renderer.setPixelRatio(${PIXEL_RATIO});
  renderer.setClearColor(0x000000, 0);

  const group = new THREE.Group();
  group.rotation.x = ${MESH_ROTATION_X};
  group.position.y = ${MESH_POSITION_Y};

  ${mode === 'base' ? `
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  ];
  const mesh = new THREE.Mesh(geometry, materials);
  group.add(mesh);
  ` : `
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const outline = new THREE.LineSegments(edgesGeometry, lineMaterial);
  group.add(outline);
  `}

  scene.add(group);
  renderer.render(scene, camera);
  window.__captureReady = true;
</script>
</body>
</html>`;
}

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const filePath = path.join(rootDir, decodeURIComponent(req.url.split('?')[0]));
    try {
      const body = readFileSync(filePath);
      const contentType = filePath.endsWith('.js') ? 'text/javascript' : 'text/html';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function capture(browser, baseUrl, mode, outPath) {
  const page = await browser.newPage({ viewport: { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT } });
  page.on('pageerror', (err) => console.log(`[pageerror:${mode}]`, err));
  await page.goto(`${baseUrl}/${mode}.html`, { waitUntil: 'load' });
  await page.waitForFunction('window.__captureReady === true', undefined, { timeout: 15000 });
  const dataUrl = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  writeFileSync(outPath, Buffer.from(base64, 'base64'));
  await page.close();
  console.log(`Wrote ${path.relative(projectRoot, outPath)}`);
}

async function main() {
  mkdirSync(path.dirname(OUT_BASE), { recursive: true });
  mkdirSync(harnessDir, { recursive: true });
  writeFileSync(path.join(harnessDir, 'base.html'), harnessHtml({ mode: 'base' }));
  writeFileSync(path.join(harnessDir, 'mask.html'), harnessHtml({ mode: 'mask' }));
  cpSync(THREE_BUILD_DIR, harnessDir, { recursive: true });

  const server = await startStaticServer(harnessDir);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  try {
    // The very first WebGL context created in this headless browser process
    // reliably loses context mid-render (a swiftshader/driver warm-up glitch,
    // reproduced regardless of which capture runs first) - burn a throwaway
    // context on a blank page before the two real captures so neither of them
    // eats that failure.
    const warmupPage = await browser.newPage();
    await warmupPage.goto(`${baseUrl}/mask.html`, { waitUntil: 'load' });
    await warmupPage.waitForFunction('window.__captureReady === true', undefined, { timeout: 15000 }).catch(() => {});
    await warmupPage.close();

    await capture(browser, baseUrl, 'base', OUT_BASE);
    await capture(browser, baseUrl, 'mask', OUT_MASK);
  } finally {
    await browser.close();
    server.close();
    rmSync(harnessDir, { recursive: true, force: true });
  }
}

main();
