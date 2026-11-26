import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [svelte({ compilerOptions: { runes: true } })],
	server: { port: 5173, strictPort: true },
	build: { target: "esnext" },
});
