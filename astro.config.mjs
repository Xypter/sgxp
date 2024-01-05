import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify/functions';

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: netlify({
    edgeMiddleware: true,
  }),
  vite: {
    ssr: {
      noExternal: ['path-to-regexp'],
    },
  },
});