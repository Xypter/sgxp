import type { APIRoute } from 'astro';
import { buildComicPreview } from '../../../lib/comicPreview';

// Previews never change (the archive is frozen), so each one is built once
// per server process and then served from memory. In-flight builds are
// shared, so a page of 25 cards requesting at once doesn't duplicate work.
// ~5-15KB per PNG; capped well above the ~900 archived comics.
const MAX_CACHED = 3000;
const cache = new Map<string, Promise<Buffer | null>>();

function getPreview(comicId: string): Promise<Buffer | null> {
  let pending = cache.get(comicId);
  if (!pending) {
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value!);
    pending = buildComicPreview(comicId);
    cache.set(comicId, pending);
    // Transient failures (CDN hiccups) shouldn't stick - drop them so the
    // next request retries. A resolved `null` (no usable page) does stick.
    pending.catch(() => cache.delete(comicId));
  }
  return pending;
}

export const GET: APIRoute = async ({ params }) => {
  const comicId = params.comicId ?? '';
  if (!/^\d{1,9}$/.test(comicId)) {
    return new Response('Invalid comic id', { status: 400 });
  }

  try {
    const png = await getPreview(comicId);
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
    console.error(`Error building Smack Jeeves preview for ${comicId}:`, error);
    return new Response('Preview temporarily unavailable', { status: 502 });
  }
};
