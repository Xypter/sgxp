import type { APIRoute } from 'astro';
import { buildComicPreview, buildPagePreview } from '../../../lib/comicPreview';

// GET /api/smackjeeves-preview/<comicId>             - the comic's card preview
// GET /api/smackjeeves-preview/<comicId>?path=<page> - one page's preview, for
//     the reader's page list (<page> is the chapter's pagesPath from metadata)
//
// Previews never change (the archive is frozen), so each one is built once
// per server process and then served from memory. In-flight builds are
// shared, so a page of 25 cards requesting at once doesn't duplicate work.
// ~5-15KB per PNG. Comic previews are capped well above the ~900 archived
// comics; page previews (38k+ pages archive-wide) keep only the most recent.
const MAX_CACHED_COMICS = 3000;
const MAX_CACHED_PAGES = 2000;
const comicCache = new Map<string, Promise<Buffer | null>>();
const pageCache = new Map<string, Promise<Buffer | null>>();

// Each build downloads a full page and scans it with sharp. A long page list
// scrolled quickly fires dozens of these at once - run a few at a time.
const MAX_CONCURRENT_BUILDS = 4;
let activeBuilds = 0;
const waiting: (() => void)[] = [];

async function limited<T>(build: () => Promise<T>): Promise<T> {
  if (activeBuilds >= MAX_CONCURRENT_BUILDS) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  activeBuilds++;
  try {
    return await build();
  } finally {
    activeBuilds--;
    waiting.shift()?.();
  }
}

function cached(
  cache: Map<string, Promise<Buffer | null>>,
  max: number,
  key: string,
  build: () => Promise<Buffer | null>
): Promise<Buffer | null> {
  let pending = cache.get(key);
  if (pending) {
    // Refresh recency, so the page cache drops the least recently used.
    cache.delete(key);
    cache.set(key, pending);
    return pending;
  }
  if (cache.size >= max) cache.delete(cache.keys().next().value!);
  pending = limited(build);
  cache.set(key, pending);
  // Transient failures (CDN hiccups) shouldn't stick - drop them so the
  // next request retries. A resolved `null` (no usable page) does stick.
  pending.catch(() => cache.delete(key));
  return pending;
}

export const GET: APIRoute = async ({ params, url }) => {
  const comicId = params.comicId ?? '';
  if (!/^\d{1,9}$/.test(comicId)) {
    return new Response('Invalid comic id', { status: 400 });
  }

  const pagePath = url.searchParams.get('path');
  if (pagePath !== null && (pagePath.length > 200 || !/^[\w\-./]+$/.test(pagePath) || pagePath.includes('..'))) {
    return new Response('Invalid page path', { status: 400 });
  }

  try {
    const png =
      pagePath === null
        ? await cached(comicCache, MAX_CACHED_COMICS, comicId, () => buildComicPreview(comicId))
        : await cached(pageCache, MAX_CACHED_PAGES, `${comicId}/${pagePath}`, () =>
            buildPagePreview(comicId, pagePath)
          );
    if (!png) {
      return new Response('No preview available', {
        status: 404,
        headers: { 'Cache-Control': 'public, max-age=86400' },
      });
    }
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=2592000, immutable',
      },
    });
  } catch (error) {
    console.error(`Error building Smack Jeeves preview for ${comicId}${pagePath ? ` (${pagePath})` : ''}:`, error);
    return new Response('Preview temporarily unavailable', { status: 502 });
  }
};
