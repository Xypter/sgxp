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
