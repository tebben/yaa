import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [svelte({ compilerOptions: { runes: true } }), tailwindcss()],
	server: { port: 5173, strictPort: true },
	build: { target: "esnext" },
});
