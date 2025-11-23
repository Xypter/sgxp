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
  integrations: [react(), svelte(), mcp()],
});