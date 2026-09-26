import type { APIRoute } from 'astro';
import { glyphStylesheet } from '../lib/spriteCardText';

// The sprite cards' glyph classes, generated from charMap (see spriteCardText.ts).
// Prerendered to a static file at build time; FrontPageLayout links it with a content
// hash so a charMap change never gets served from a stale cache.
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(glyphStylesheet(), { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
