# SGXP Project Context

## Project Overview
The SGXP is an open-source sprite website where users can upload sprite sheets, sprite comics, and showcase their WIP art. This is a complete rewrite of the original PHP-based site using modern web technologies.

## Tech Stack
- **Framework**: Astro 5 (server-side rendering and routing)
- **UI Components**: Svelte 5 (all components are Svelte, no React)
- **Component Library**: shadcn-svelte (Svelte-specific variation of shadcn)
- **Styling**: Custom stylesheets with Tailwind CSS 4
- **CMS**: Payload CMS (external, handles content management and PostgreSQL database)
- **Database**: PostgreSQL (managed by Payload CMS, external to this project)
- **Storage**: AWS S3 (sprite sheet uploads and media storage)
- **Icons**: Lucide Svelte

## Key Conventions
- Use 2-space indentation
- All components must be Svelte 5 components (no React)
- Use shadcn-svelte components, not vanilla shadcn
- Database interactions happen through Payload CMS API, not direct queries
- Custom stylesheets take precedence; Tailwind is supplementary

## Project Structure
- `/src/components` - Svelte UI components
- `/src/pages` - Astro pages and routes
- `/src/db` - Database setup and queries (legacy from Supabase migration)
- `/public` - Static assets

## Discord Bot (`/discord-bot`)
A standalone Node service, separate from the Astro app, deployed as its own Coolify app from the `discord-bot/` subdirectory (own `Dockerfile`, own `package.json`, npm not pnpm). Built 2026-08-26 for personal push notifications (phone alerts via Discord DM) plus public-facing posts to the SGXP Discord server (daily leaderboard; birthdays are handled manually outside the website/bot).

- **Uses `discord.js` v14, gateway-based** — connects outbound to Discord, so it needs no public inbound URL/subdomain for Discord's sake.
- **Data access**: calls the same Payload CMS REST API the website uses (`PAYLOAD_URL`), via `src/payload.js`. No direct DB access, no local Payload config.
- **Real-time notifications**: the site forwards events to the bot's internal `POST /events` endpoint (bearer-secret protected, see `src/server.js`) via `src/lib/discordBot.ts`'s `notifyDiscordBot()`, called from the site's Payload webhook handlers (e.g. `src/pages/api/webhooks/sprite-updated.ts` on `sprite.created`). Prefer internal Docker networking between the two Coolify apps over exposing this endpoint publicly — nothing about the bot needs to be internet-facing.
- **Scheduled jobs** (`src/jobs.js`, `node-cron`): daily leaderboard post to `DISCORD_ANNOUNCE_CHANNEL_ID`, pulling top sprites by likes from Payload.
- **Slash commands** (`src/commands/`): `/stats` (site totals), `/leaderboard` (top sprites). Register/update them via `npm run deploy-commands` after changing any command definition — Discord doesn't pick up command changes automatically. Set `DISCORD_DEV_GUILD_ID` for instant per-guild registration during development; omit in production for global registration (propagates slower).
- **One-off testing**: `node src/test-message.js <channelId> "message"` logs in, sends a single message, and exits — useful for verifying the bot can post without running the full process.
- Env vars are documented in `discord-bot/.env.example`. The **Public Key** from the Discord Developer Portal is NOT used (that's only for HTTP-interaction bots; this one uses the gateway) — don't add it expecting it to do anything.
- **Actionable DM buttons** (`src/archivistActions.js`): the `archivist.requested` event attaches a "Grant Archivist Access" button to the owner's DM (built in `server.js`, handled via `Events.InteractionCreate` in `index.js`). Clicking it calls `payload.js`'s `grantArchivistAccess()`, which PATCHes Payload authenticated as an admin user via API key (`PAYLOAD_API_KEY` env var, requires `useAPIKey: true` on the CMS's `Users` collection and generating a key from that admin's own profile page in the Payload admin panel — Payload has no way to generate this key programmatically, it's a manual one-time admin-panel step). This is the pattern to extend for any future "act on this from Discord" feature — build the button in the event handler, gate the click to `DISCORD_OWNER_USER_ID`, and always `deferUpdate()`/`editReply()` rather than a bare `reply()`/`update()` since the Payload round-trip can exceed Discord's 3-second interaction window.

## Development Scripts
- `npm run dev` or `npm run start` - Start Astro dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run setup-db` - Database setup script (legacy)

## Important Notes
- Previously used Supabase, now migrated to Payload CMS
- Previously used Sentry, now removed from stack
- Component library is shadcn-svelte specifically, which has different APIs than React-based shadcn

## Current Focus
Working on shadcn-svelte upgrade as indicated by the `shadcn-upgrade` branch.

## Known Bugs & Quirks (learned 2026-08-26, archive triage feature work)

- **`src/utils/auth.js` returns the wrong shape.** `verifyToken`/`getUserFromRequest` return Payload's raw `/api/users/me` response (`{ user, token, exp }`) unmodified — NOT the unwrapped user. Any code that does `user.role` on the result of `getUserFromRequest` will always get `undefined`, silently breaking role checks (this caused a real bug where admins were redirected out of a role-gated page). **Use `resolveUser(cookies)` from `src/lib/userCache.ts` instead** — it correctly does `data.user || data` and also caches to a cookie. Prefer it over `utils/auth.js` for any new page needing the current user.

- **TanStack table (`src/components/ui/data-table/create-svelte-table.svelte.ts`) reactivity is fragile for client-only, empty-then-fetch components.** The wrapper mutates a long-lived `table` instance via getters + a nested `$effect`/`setOptions` chain. The one existing usage (`UserUploadsViewer.svelte`) never actually exercises "start empty, fetch async, re-render with new data" — it pre-populates from SSR props (`initialSprites`) and explicitly skips the first client fetch. A new `client:only="svelte"` table component that starts with empty `$state` and populates it via `fetch()` may not reliably re-render.
  - **Fix that worked**: don't hold `table` as a plain `const`. Build it as `let table = $derived.by(() => createSvelteTable({ data: entries, state: { pagination, sorting }, ... }))` using plain values (not getters) — this creates a fresh table instance whenever the actual `$state` inputs change, which is guaranteed-correct Svelte 5 reactivity instead of relying on the wrapper's internal option-merging timing.
  - Also initialize any `isLoading` flag to `true` (not `false`) when a component always fetches on mount — otherwise there's a flash where `isLoading=false && data=[]` renders an "empty" state before the effect even runs once.

- **`.dockerignore`'s corrupted first line (`2213n.3ode_modules`) was fixed 2026-08-27** — it's `node_modules` now. (It had been sitting as an uncommitted local-only change the whole time, never actually in a commit — worth double-checking `git diff .dockerignore` if this ever looks wrong again.)

- **MSYS/Git-Bash `ps`/`kill` PIDs don't match real Windows PIDs.** To reliably kill/inspect a specific dev server process on Windows from this shell, use `netstat -ano | grep :<port>` to get the real Windows PID, then `taskkill //PID <pid> //F` — plain bash `kill <pid>` from `ps aux` output often targets the wrong (MSYS-subsystem) process tree entirely.

- **`createRawSnippet` + a hand-built HTML template string is unsafe for real user/scraped content.** Used for table cells showing comic titles (`ArchiveTriageTable.svelte`), it crashed with `Uncaught TypeError: 'get nextSibling' called on an object that does not implement interface Node` once real data (34k+ titles) landed — any title containing `&`, `<`, or `>` (521 of them did, e.g. "Yoshi & Kirby") corrupts the HTML structure Svelte's compiler expects. Fix: use a tiny real Svelte component with normal `{value}` text interpolation (auto-escaped) instead of `createRawSnippet`/raw template literals — `createRawSnippet` is for pre-sanitized trusted HTML only, never for arbitrary text.

- **`JSON.stringify({field: undefined})` produces `{}` — the key vanishes entirely.** A PATCH body built as `JSON.stringify({ [field]: value })` silently does nothing if you intend "clear this field" via `value = undefined` — the key never reaches the server, so the old value stays. To actually clear/unset a field over the API, send `null` explicitly, not `undefined`.

- **The installed `lucide-svelte` (0.544.0) renamed some icons from their older/more-commonly-known names** — `Loader2` doesn't exist anymore, it's `LoaderCircle` now (confirmed by grepping `node_modules/lucide-svelte/dist/icons/index.js`; `Check` is unaffected). A `Loader2` import fails silently at the Svelte-compile level (compiler doesn't check named imports exist) and only breaks at runtime/bundle time. Before using any lucide icon by a name you're not 100% sure of, grep the installed `dist/icons/index.js` first.

- **When talking to Payload's REST API directly from a Svelte component's `catch` block, always check `data.errors?.[0]?.message` before `data.message`** — Payload wraps every HTTP error as `{ errors: [{ message }] }`, there is no top-level `message` (see `sgxp-cms/CLAUDE.md` for the full explanation). Checking `data.message` alone always silently falls back to whatever generic string you wrote, hiding the real backend validation reason from the user.

- **Prefer an explicit user-triggered action over an automatic side-effect of editing a field**, when the action represents a meaningful workflow commitment (e.g. "submit this for review"). Originally, editing the sprite-comic/game-related checkboxes silently auto-transitioned an entry to "prepared" — this surprised the user ("the comic shouldn't go into review automatically") and got reverted in favor of a dedicated "Ready for review" checkbox/button that's the *only* thing allowed to trigger that transition. If a state transition has real consequences (locking fields, crediting a specific user, notifying someone), make the user click something that says so, rather than inferring intent from an unrelated edit.

- **TanStack column headers aren't clickable/sortable by default just because `getSortedRowModel`/`onSortingChange` are wired up** — nothing in this codebase's shared `DataTable.svelte`/`Table.*` primitives renders a sort affordance on headers (checked: `UserUploadsViewer.svelte` has the same latent gap). The correct shadcn-svelte pattern (confirmed via their docs) is per-column: `header: ({column}) => renderComponent(SortButton, { onclick: column.getToggleSortingHandler() })`, a ghost-variant `Button` + `ArrowUpDown`/`ArrowUp`/`ArrowDown` lucide icon reflecting `column.getIsSorted()`. This is a per-column opt-in, not something to bake into the shared table primitives.

- **Postgres enum columns sort by their declaration order, not alphabetically** (`pg_enum.enumsortorder`). Verified directly against the DB. Useful trick: if a select field's `options` array is declared in the priority order you want (e.g. `unsorted, identified, uploaded`), a plain ascending `sort=fieldName` on that column already returns rows in that priority — no need for a custom sort key.

- **shadcn's `Select` trigger (`Select.svelte`'s `.theme-select-trigger`) is hardcoded to `height: 42px`, but the base `Input` component defaults to shadcn's own `h-9` (36px).** They visually mismatch when placed side-by-side in a toolbar unless one is explicitly overridden to match the other.

- **`Combobox.svelte` (`$lib/components/ui/base`) is the better choice over `Select` for long option lists** (e.g. the 25-item category list) — it has its own built-in search filter and a custom scrollable list, and doesn't have bits-ui `Select`'s auto-rendered click-to-scroll chevron buttons (`data-slot="select-scroll-up-button"`/`"-down-button"`) that appear once a plain `Select`'s content overflows.

## Known Bugs & Quirks (learned 2026-08-27/28, archive triage live-update work)

- **This project has two parallel "shadcn" layers — don't confuse them.** `src/components/ui/<name>/` holds genuine CLI-generated shadcn-svelte primitives (e.g. `button/button.svelte` with its `tv()` variants, using `@/lib/utils` and `@/components/ui/...` import aliases). `src/lib/components/ui/base/<Name>.svelte` are this project's own *themed wrapper* components around those primitives (adding the `themed` prop, `.theme-*` CSS, and app-specific convenience props), re-exported from `$lib/components`. When adding a new shadcn-svelte component (e.g. we added `toggle`/`toggle-group` this way), fetch the real source from `https://shadcn-svelte.com/registry/<name>.json` (its `$UTILS$`/`$UI$` placeholders map to `@/lib/utils`/`@/components/ui` here), drop it under `src/components/ui/<name>/` unmodified, then write a themed wrapper in `src/lib/components/ui/base/` if app code needs one — don't hand-roll a look-alike component from scratch.

- **`EditableSelectCell`/`EditableComboboxCell` silently swap the real control for plain readonly text whenever `disabled` is true** (their own `{#if disabled}<span class="readonly-value">...` branch) — this is the right look for genuinely locked rows (e.g. `rowLocked`/`flagsLocked`), but wrong for "temporarily not applicable, should look faded but still look like the control" (e.g. Category/Rating before an entry is marked a sprite comic). Both cells now take an additional `faded` prop that bypasses the readonly-text branch and renders the real `Select`/`Combobox` with `disabled` passed through instead — added because the base `Select`/`Combobox` wrappers didn't support a `disabled` prop at all before this (now do, styled via Tailwind's `disabled:opacity-50` on `Select`'s trigger and a plain `:disabled` CSS rule added to `Combobox`'s trigger). Reach for `faded` before duplicating this disabled-but-visible pattern elsewhere.

- **This app's local dev `.env` points `PAYLOAD_URL` at production CMS (`https://cms.sgxp.me`), not a local Payload instance.** Easy to forget mid-session and accidentally test/mutate real production data while believing you're on `localhost`, or to test a feature against `localhost` while the thing you're actually trying to verify (e.g. a Payload webhook that only knows about the deployed `SITE_URL`) can only ever reach the real deployed site. Double-check which URL a running dev server is actually pointed at, and which page/tab you're looking at, before concluding a live-update feature "isn't working."

- **Coolify's per-app Gzip Compression setting can silently swallow a Server-Sent Events stream with zero errors anywhere in the stack.** Building live-update-over-SSE for the archive triage table (`src/pages/api/archive-entries/stream.ts`, fed by a Payload `afterChange` hook webhook), every layer of logging showed success — SSE client connected, webhook received, broadcast enqueued to N clients — but the browser's `EventSource` never received the `entry-updated` message (confirmed via `onopen` firing but no message ever logging, i.e. the connection opens fine but body bytes never arrive). Cause: compression buffers the response before it can flush, which defeats a long-lived stream that's supposed to deliver small chunks in real time. Fix: disable Gzip Compression in Coolify's app settings for any app that serves an SSE/streaming endpoint (done for both the `sgxp` and `sgxp-cms` containers). `X-Accel-Buffering: no` on the response is cheap insurance but did not by itself fix this — the Coolify-level toggle was what mattered. If a future streaming/SSE endpoint "connects but never receives messages," check this setting before assuming the app code is wrong.

- **When Payload's REST webhook docs/comments describe a hook that "should" call the site, verify the actual code exists before assuming it's wired up.** `sprite-updated.ts` had a doc comment saying "Configure this webhook in Payload CMS" but grepping the entire `sgxp-cms` repo found no matching `fetch`/webhook call anywhere — it's unclear whether that one is actually configured (maybe via the admin UI, maybe never finished). The archive-entries live-update hook was written from scratch in `ArchiveEntries.ts`'s `afterChange` array as a `setImmediate`-wrapped fire-and-forget `fetch()` (mirroring the existing prepared/reviewed-count-increment hook's pattern) rather than assuming the sprite one was a working template to copy.

- **This repo has no real Payload migrations — schema changes only reach production via `next dev`'s auto-push, run locally against the prod `DATABASE_URI`.** Confirmed in `@payloadcms/db-postgres`'s `connect.js`: `pushDevSchema` only runs when `NODE_ENV !== 'production'`, and the production container (`next start`, `NODE_ENV=production` in the Dockerfile) never does this — there's also no `migrations/` directory and no `prodMigrations` config, so there's no other path for new columns to reach prod. After adding/changing any field on a Payload collection, you must run `npm run dev` in `sgxp-cms` locally (it points at the real prod DB) and hit any Payload route (e.g. `curl localhost:PORT/api/users/me`) to force initialization and trigger the push — Payload only pushes lazily on first request, not at server boot. Verify it actually landed with a raw query (`information_schema.columns`) before assuming it worked, then kill the local server. `admin.readOnly` on a field is a UI-only restriction (doesn't affect API access) — don't reach for it to "protect" a field from the API; use `access.update` for that.

- **Per-user targeted SSE (as opposed to broadcast-to-everyone) needs the connection registry keyed by user ID, not just a flat `Set` of controllers.** Added to `archiveEventHub.ts` for the "archivist access granted" live push: `addArchiveEventClient(controller, userId)` returns a `{controller, userId}` record, and `notifyUserAccessGranted(userId)` filters connected clients down to that one user before sending — versus `broadcastArchiveEntryChange` which still sends to everyone. Same hub, same single `/api/archive-entries/stream` connection carries both event types (`entry-updated` broadcast, `access-granted` targeted) — no need for a second EventSource per concern.

- **`resolveUser`'s 5-minute user-info cache can show stale permission state after an out-of-band grant.** The Discord bot's "Grant Archivist Access" button PATCHes Payload directly, which never touches the site's `sgxp-user` cookie cache — so a page reload within that 5-minute window kept showing "Request Pending" even though access was actually granted. Fixed two ways: `resolveUser(cookies, { forceFresh: true })` skips the cache entirely for the archive triage page (a low-traffic, permission-sensitive page where correctness matters more than saving one Payload round-trip), and the live SSE `access-granted` push (previous note) updates the open page instantly without even needing a reload. Reach for `forceFresh` on any other page where an out-of-band permission change needs to be reflected immediately.
