import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// The built client is embedded into the Turbodrop binary and served from the computer itself,
// so everything (fonts included) is bundled — phones may have no internet at all.
export default defineConfig({
  plugins: [svelte()],
  base: '/',
  server: {
    fs: { allow: ['..'] },
    // `npm run dev` talks to a running Turbodrop on this machine.
    proxy: { '/api': { target: 'http://127.0.0.1:47474', ws: true } },
  },
  build: {
    target: ['safari14', 'chrome90', 'firefox90'],
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 400,
  },
  test: {
    environment: 'node',
  },
});
