// Payload `select`/`populate` params that trim sprite LIST responses (the /sprites
// grid, both its SSR first page in sprites.astro and SpriteBrowser's own client-side
// fetches) down to what the grid and the in-page SpriteViewer actually use.
//
// At depth=1, every sprite otherwise embeds its author's entire user document
// (sessions, lastLoginAt, ban fields, API key fields, social links, ...) and ~20
// fields per media doc - roughly half of a 100-sprite response (237KB -> ~125KB
// raw), which the SSR page then also serializes into its island props.
//
// The list data is handed straight to SpriteViewer as `initialSprite` when a card is
// clicked (it doesn't refetch), so this only drops fields nothing reads - check
// SpriteViewer.svelte and src/components/sprite/ before removing anything else.
//
// NOTE: media `prefix` looks unused but must stay - Payload's S3 storage adapter
// builds `url` from it, and without it every image URL loses its `/media/` segment.
const USER_FIELDS = ['id', 'username', 'displayName', 'profilePicture', 'role', 'roleColor', 'prestigeRole', 'prestigeColor'];
const MEDIA_FIELDS = ['id', 'url', 'alt', 'filename', 'filesize', 'width', 'height', 'mimeType', 'prefix'];
const SECTION_FIELDS = ['id', 'name'];
// Excluded (select[field]=false keeps every other sprite field): internal/moderation
// and search-index fields that no sprite UI renders.
const EXCLUDED_SPRITE_FIELDS = ['searchVector', 'adminFeedback', 'submitterResponse', 'announcedAt'];

export function applySpriteListFieldParams(params: URLSearchParams): URLSearchParams {
  for (const field of EXCLUDED_SPRITE_FIELDS) params.set(`select[${field}]`, 'false');
  for (const field of USER_FIELDS) params.set(`populate[users][${field}]`, 'true');
  for (const field of MEDIA_FIELDS) params.set(`populate[media][${field}]`, 'true');
  for (const field of SECTION_FIELDS) params.set(`populate[sections][${field}]`, 'true');
  return params;
}
