import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import path from 'path';
import { fileURLToPath } from 'url';

import svelte from '@astrojs/svelte';
import mcp from 'astro-mcp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: "standalone"
  }),
  // Astro's built-in same-origin check for non-GET form/multipart submissions compares the
  // browser's Origin header against its own computed request URL - but @astrojs/node has no way
  // to trust X-Forwarded-Proto from Traefik (which terminates TLS in front of it), so it always
  // sees itself as http:// while the browser correctly sends https://, and every real edit
  // (PATCH/POST with FormData, e.g. sprite uploads/edits) gets rejected as "cross-site" in
  // production. Disabled here since this app's actual auth boundary is the payload-token cookie,
  // not this check.
  security: {
    checkOrigin: false
  },
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '$lib': path.resolve(__dirname, './src/lib'),
        '$components': path.resolve(__dirname, './src/components')
      }
    },
    server: {
      watch: {
        ignored: ['**/.env', '**/.env.*', '**/node_modules/**']
      }
    },
    envPrefix: ['PUBLIC_'],
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),
    svelte({
      compilerOptions: {
        hmr: false
      }
    }),
    mcp()
  ],
});