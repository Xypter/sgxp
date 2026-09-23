// One-off build tool, not part of `npm run build` - see Logo3D.svelte and the
// comment at the top of its script block for why this isn't wired into every build.
//
// Pre-builds the 3D "SPRITES" logo geometry (font parsing + TextGeometry extrusion +
// edge/outline computation) offline, so the browser can just load a flat JSON of
// vertex data instead of re-doing that work on every page load.
//
// Rerun this manually (`node scripts/generate-logo-geometry.mjs`) any time the logo's
// text or font changes, and commit the regenerated public/models/sprites-logo.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as THREE from 'three';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const TEXT = 'SPRITES';
const FONT_PATH = path.join(projectRoot, 'public/fonts/Starbirl.otf');
const OUTPUT_PATH = path.join(projectRoot, 'public/models/sprites-logo.json');

// Keep these in sync with the mesh options that used to live in Logo3D.svelte's
// create3DText() - moving text/font/depth means rerunning this script.
const GEOMETRY_OPTIONS = {
  size: 6.5,
  depth: 20,
  curveSegments: 4,
  bevelEnabled: false,
};

function buildEdgesWithLineDistance(geometry) {
  const edgesGeometry = new THREE.EdgesGeometry(geometry);

  const pos = edgesGeometry.attributes.position;
  const lineDistances = new Float32Array(pos.count);
  let dist = 0;
  for (let i = 0; i < pos.count; i += 2) {
    const x1 = pos.getX(i), y1 = pos.getY(i), z1 = pos.getZ(i);
    const x2 = pos.getX(i + 1), y2 = pos.getY(i + 1), z2 = pos.getZ(i + 1);
    const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
    lineDistances[i] = dist;
    lineDistances[i + 1] = dist + d;
    dist += d; // Accumulate distance for a continuous flow
  }
  edgesGeometry.setAttribute('lineDistance', new THREE.BufferAttribute(lineDistances, 1));

  return edgesGeometry;
}

async function main() {
  const ttfBuffer = readFileSync(FONT_PATH);
  // TTFLoader/FontLoader.parse() are pure functions (no DOM/XHR), so they run fine here.
  const ttfJson = new TTFLoader().parse(
    ttfBuffer.buffer.slice(ttfBuffer.byteOffset, ttfBuffer.byteOffset + ttfBuffer.byteLength)
  );
  const font = new FontLoader().parse(ttfJson);

  const geometry = new TextGeometry(TEXT, { font, ...GEOMETRY_OPTIONS });

  geometry.computeBoundingBox();
  const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
  const yMid = -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
  geometry.translate(xMid, yMid, 0);

  const edgesGeometry = buildEdgesWithLineDistance(geometry);

  // TextGeometry/EdgesGeometry are "parametric" geometries - they set a `.parameters`
  // property, which makes BufferGeometry.toJSON() serialize just the constructor
  // inputs (font, shapes, options) instead of the actual computed vertex data. That
  // would mean re-running the extrusion/edge computation on load, defeating the
  // point. Copying into a plain BufferGeometry (no `.parameters`) strips that down to
  // the raw attribute arrays instead.
  const flatten = (geom) => new THREE.BufferGeometry().copy(geom);

  const output = {
    text: TEXT,
    generatedAt: new Date().toISOString(),
    main: flatten(geometry).toJSON(),
    edges: flatten(edgesGeometry).toJSON(),
  };

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output));

  console.log(`Wrote ${path.relative(projectRoot, OUTPUT_PATH)}`);
}

main();
