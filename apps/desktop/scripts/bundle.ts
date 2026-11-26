// esbuild settings for the three Node-side bundles: Electron main, the
// preload (CommonJS, because sandboxed preloads cannot be ES modules) and the
// core's utilityProcess entry. Shared by build.ts and dev.ts.
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BuildOptions } from "esbuild";

const desktop = join(import.meta.dirname, "..");
export const outDir = join(desktop, "dist");

const common: BuildOptions = {
	bundle: true,
	platform: "node",
	target: "node24",
	external: ["electron"],
	sourcemap: "linked",
	logLevel: "warning",
};

export const bundles: BuildOptions[] = [
	{
		...common,
		entryPoints: { main: join(desktop, "main.ts") },
		format: "esm",
		outdir: outDir,
	},
	{
		...common,
		entryPoints: { core: fileURLToPath(import.meta.resolve("@yaa/core/main")) },
		format: "esm",
		outdir: outDir,
	},
	{
		...common,
		entryPoints: { preload: join(desktop, "preload.ts") },
		format: "cjs",
		outExtension: { ".js": ".cjs" },
		outdir: outDir,
	},
];

export const webRoot = join(desktop, "../web");
