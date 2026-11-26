import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// Tests import the dock entry, which brings Svelte components with it.
export default defineConfig({
	plugins: [svelte({ compilerOptions: { runes: true } })],
});
