// esbuild settings for the Node-side bundles: Electron main, the preload
// (CommonJS, because sandboxed preloads cannot be ES modules), the
// utilityProcess entries of the core and the plugin host, and the fake
// agent, which core runs in dev mode only. Shared by build.ts and dev.ts.
import { readdirSync } from "node:fs";
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
		// A native module, loaded from node_modules at run time
		// (docs/decisions/0019-native-modules-node-sqlite.md).
		external: ["electron", "node-pty"],
		format: "esm",
		outdir: outDir,
	},
	{
		...common,
		entryPoints: {
			"plugin-host": fileURLToPath(
				import.meta.resolve("@yaa/plugin-host/main"),
			),
		},
		format: "esm",
		outdir: outDir,
	},
	{
		...common,
		entryPoints: {
			"fake-agent": fileURLToPath(import.meta.resolve("@yaa/fake-agent/main")),
		},
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

// The built-in plugins, one folder each, built beside their sources.
export const pluginsRoot = join(desktop, "../../plugins");

export const pluginDirs = (): string[] =>
	readdirSync(pluginsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(pluginsRoot, entry.name));
