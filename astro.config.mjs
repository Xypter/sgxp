import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: "standalone"
  }),
  vite: {
    server: {
      watch: {
        ignored: ['**/.env', '**/.env.*', '**/node_modules/**']
      }
    },
    envPrefix: ['PUBLIC_'],
    plugins: [tailwindcss()],
  },
  integrations: [react(), sentry(), spotlightjs(), svelte()],
});