import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  root: 'app',
  base: './',
  plugins: [svelte(), tailwindcss()],
  build: { outDir: '../dist/app', emptyOutDir: true },
  server: { port: 5173, strictPort: true },
});
