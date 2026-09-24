import sharp from 'sharp';

// Builds the 100x100 preview thumbnails shown on Smack Jeeves archive cards
// (the comic's 3rd page) and the reader's page list (each page): a
// pixel-for-pixel crop (never scaled - these are sprite comics) of the most
// sprite-dense spot on the page.

const CDN_BASE = 'https://cdn.sgxp.me/smackjeeves_archive';
export const PREVIEW_SIZE = 100;
const CELL = 10;

// Page 3 usually has the main content (pages 1-2 tend to be title/intro
// pages); fall back to whatever else exists if it's missing.
const PAGE_PREFERENCE = [2, 3, 1, 0];

interface Chapter {
  pagesPath?: string[];
}

async function fetchChapters(comicId: string): Promise<Chapter[]> {
  const response = await fetch(`${CDN_BASE}/smackjeeves-${comicId}/${comicId}/metadata.js`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`metadata ${response.status}`);
  // The file is `let metadata = {...}` wrapping plain JSON - parse it as
  // JSON rather than evaluating it, so nothing from the CDN ever executes.
  const text = await response.text();
  const match = text.match(/let\s+metadata\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) return [];
  return JSON.parse(match[1]).chapters ?? [];
}

export function pageUrl(comicId: string, pagesPath: string): string | null {
  const base = `${CDN_BASE}/smackjeeves-${comicId}/${comicId}/`;
  const url = new URL(pagesPath, base);
  // pagesPath comes from the metadata file - refuse anything that resolves
  // outside this comic's own folder.
  return url.href.startsWith(base) ? url.href : null;
}

/**
 * Picks the PREVIEW_SIZE square with the most sprite-like detail: sprites
 * spread their pixels across many distinct colors, while speech bubbles,
 * panel gutters and flat backgrounds are dominated by one. Scored on a grid
 * of CELL-sized cells, then the best window found via an integral image.
 */
async function pickCrop(image: Buffer) {
  const { data, info } = await sharp(image, { animated: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  if (width <= PREVIEW_SIZE || height <= PREVIEW_SIZE) {
    return { left: 0, top: 0, width: Math.min(width, PREVIEW_SIZE), height: Math.min(height, PREVIEW_SIZE) };
  }

  const cols = Math.floor(width / CELL);
  const rows = Math.floor(height / CELL);
  const cellScores = new Float64Array(cols * rows);
  const counts = new Map<number, number>();

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      counts.clear();
      for (let y = cy * CELL; y < (cy + 1) * CELL; y++) {
        for (let x = cx * CELL; x < (cx + 1) * CELL; x++) {
          const i = (y * width + x) * 4;
          // 4 bits per channel, so JPEG noise doesn't read as detail.
          const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      let dominantCount = 0;
      for (const n of counts.values()) if (n > dominantCount) dominantCount = n;
      const dominant = dominantCount / (CELL * CELL);
      cellScores[cy * cols + cx] = dominant > 0.55 ? 0 : counts.size * (1 - dominant);
    }
  }

  const stride = cols + 1;
  const integral = new Float64Array(stride * (rows + 1));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      integral[(y + 1) * stride + x + 1] =
        cellScores[y * cols + x] + integral[y * stride + x + 1] + integral[(y + 1) * stride + x] - integral[y * stride + x];
    }
  }

  const span = PREVIEW_SIZE / CELL;
  let best = -1;
  let bestX = 0;
  let bestY = 0;
  for (let y = 0; y + span <= rows; y++) {
    for (let x = 0; x + span <= cols; x++) {
      const score =
        integral[(y + span) * stride + x + span] - integral[y * stride + x + span] - integral[(y + span) * stride + x] + integral[y * stride + x];
      if (score > best) {
        best = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  return { left: bestX * CELL, top: bestY * CELL, width: PREVIEW_SIZE, height: PREVIEW_SIZE };
}

type PageResult = { png: Buffer } | { missing: true } | { unreadable: true };

async function cropPage(url: string): Promise<PageResult> {
  const response = await fetch(url);
  if (response.status === 404) return { missing: true }; // page wasn't saved
  if (!response.ok) throw new Error(`page ${response.status}`);

  const image = Buffer.from(await response.arrayBuffer());
  try {
    const crop = await pickCrop(image);
    return { png: await sharp(image, { animated: false }).extract(crop).png({ compressionLevel: 9 }).toBuffer() };
  } catch {
    return { unreadable: true }; // corrupt/unsupported image
  }
}

/**
 * The comic's card preview. Returns the PNG, or null if the comic has no
 * usable page. Throws on transient failures (CDN errors) so callers don't
 * cache them.
 */
export async function buildComicPreview(comicId: string): Promise<Buffer | null> {
  const chapters = await fetchChapters(comicId);

  for (const index of PAGE_PREFERENCE) {
    const pagesPath = chapters[index]?.pagesPath?.[0];
    if (!pagesPath) continue;
    const url = pageUrl(comicId, pagesPath);
    if (!url) continue;
    const result = await cropPage(url);
    if ('png' in result) return result.png; // otherwise try the next page
  }

  return null;
}

/**
 * One page's preview, for the reader's page list. `pagesPath` comes from the
 * comic's metadata (the client already has it, so the metadata file isn't
 * re-fetched per thumbnail) and must resolve inside the comic's own folder.
 * Same null/throw contract as buildComicPreview.
 */
export async function buildPagePreview(comicId: string, pagesPath: string): Promise<Buffer | null> {
  const url = pageUrl(comicId, pagesPath);
  if (!url) return null;
  const result = await cropPage(url);
  return 'png' in result ? result.png : null;
}
