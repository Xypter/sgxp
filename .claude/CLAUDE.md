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

- **`.dockerignore` at repo root has a corrupted first line**: `2213n.3ode_modules` instead of `node_modules`. As written, `node_modules` is likely NOT being excluded from the Docker build context. Not fixed as part of this session — flag for review.

- **MSYS/Git-Bash `ps`/`kill` PIDs don't match real Windows PIDs.** To reliably kill/inspect a specific dev server process on Windows from this shell, use `netstat -ano | grep :<port>` to get the real Windows PID, then `taskkill //PID <pid> //F` — plain bash `kill <pid>` from `ps aux` output often targets the wrong (MSYS-subsystem) process tree entirely.

- **`createRawSnippet` + a hand-built HTML template string is unsafe for real user/scraped content.** Used for table cells showing comic titles (`ArchiveTriageTable.svelte`), it crashed with `Uncaught TypeError: 'get nextSibling' called on an object that does not implement interface Node` once real data (34k+ titles) landed — any title containing `&`, `<`, or `>` (521 of them did, e.g. "Yoshi & Kirby") corrupts the HTML structure Svelte's compiler expects. Fix: use a tiny real Svelte component with normal `{value}` text interpolation (auto-escaped) instead of `createRawSnippet`/raw template literals — `createRawSnippet` is for pre-sanitized trusted HTML only, never for arbitrary text.

- **`JSON.stringify({field: undefined})` produces `{}` — the key vanishes entirely.** A PATCH body built as `JSON.stringify({ [field]: value })` silently does nothing if you intend "clear this field" via `value = undefined` — the key never reaches the server, so the old value stays. To actually clear/unset a field over the API, send `null` explicitly, not `undefined`.

- **TanStack column headers aren't clickable/sortable by default just because `getSortedRowModel`/`onSortingChange` are wired up** — nothing in this codebase's shared `DataTable.svelte`/`Table.*` primitives renders a sort affordance on headers (checked: `UserUploadsViewer.svelte` has the same latent gap). The correct shadcn-svelte pattern (confirmed via their docs) is per-column: `header: ({column}) => renderComponent(SortButton, { onclick: column.getToggleSortingHandler() })`, a ghost-variant `Button` + `ArrowUpDown`/`ArrowUp`/`ArrowDown` lucide icon reflecting `column.getIsSorted()`. This is a per-column opt-in, not something to bake into the shared table primitives.

- **Postgres enum columns sort by their declaration order, not alphabetically** (`pg_enum.enumsortorder`). Verified directly against the DB. Useful trick: if a select field's `options` array is declared in the priority order you want (e.g. `unsorted, identified, uploaded`), a plain ascending `sort=fieldName` on that column already returns rows in that priority — no need for a custom sort key.

- **shadcn's `Select` trigger (`Select.svelte`'s `.theme-select-trigger`) is hardcoded to `height: 42px`, but the base `Input` component defaults to shadcn's own `h-9` (36px).** They visually mismatch when placed side-by-side in a toolbar unless one is explicitly overridden to match the other.

- **`Combobox.svelte` (`$lib/components/ui/base`) is the better choice over `Select` for long option lists** (e.g. the 25-item category list) — it has its own built-in search filter and a custom scrollable list, and doesn't have bits-ui `Select`'s auto-rendered click-to-scroll chevron buttons (`data-slot="select-scroll-up-button"`/`"-down-button"`) that appear once a plain `Select`'s content overflows.
