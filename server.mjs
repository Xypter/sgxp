// Production entry point: wraps Astro's standalone Node handler with response
// compression and a cache lifetime for public/ assets.
//
// Why this exists: Coolify's per-app Gzip Compression toggle had to be turned off
// for this app because it buffered the archive triage SSE stream
// (/api/archive-entries/stream) and silently stopped live updates from arriving.
// That toggle is all-or-nothing, so turning it off also left every HTML page, JS
// bundle, CSS file and font going out uncompressed (e.g. /sprites was ~550KB of
// HTML instead of ~40KB). Compressing here instead lets us skip exactly the
// responses that must stream - everything else is compressed as normal.
import http from 'node:http';
import compression from 'compression';

// Stop dist/server/entry.mjs from starting its own server on import - we start
// our own below around its exported handler (static files + SSR, same as the
// standalone server would serve).
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('./dist/server/entry.mjs');

const compress = compression({
  filter(req, res) {
    // Server-Sent Events must reach the browser chunk-by-chunk as they're
    // written; compression buffers them (see the note at the top of this file).
    const type = String(res.getHeader('Content-Type') ?? '');
    if (type.includes('text/event-stream')) return false;
    return compression.filter(req, res);
  },
});

// Files served from public/ (themes.css, nav icons, card frame images, ...) have
// no content hash in their names, so the adapter serves them with
// `Cache-Control: public, max-age=0` - every page load re-validates every one of
// them with a round trip. A day's cache keeps repeat visits fast while still
// picking up changes to these files within a day of a deploy. Hashed build output
// under /_astro/ keeps the adapter's own year-long immutable header (it overrides
// this), and the adapter's static server only sets its default when no
// Cache-Control is already present, so this doesn't touch pages or API responses.
const PUBLIC_ASSET_RE = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|woff2?|ttf|otf|json|glb|gltf)$/i;
const PUBLIC_ASSET_CACHE_CONTROL = 'public, max-age=86400';

const server = http.createServer((req, res) => {
  const pathname = (req.url ?? '/').split('?')[0];
  if (!pathname.startsWith('/api/') && PUBLIC_ASSET_RE.test(pathname)) {
    res.setHeader('Cache-Control', PUBLIC_ASSET_CACHE_CONTROL);
  }
  compress(req, res, () => handler(req, res));
});

const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? '0.0.0.0';
server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
