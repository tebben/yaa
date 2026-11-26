import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import {
	type PluginManifest,
	pluginManifest,
} from "@yaa/contracts/plugin-manifest";
import { svelteVersionExport } from "@yaa/contracts/plugin-ui";
import { build } from "esbuild";
import { VERSION } from "svelte/compiler";
import { sharedModulesPlugin } from "./shared-modules-plugin.ts";
import { sveltePlugin } from "./svelte-plugin.ts";

// The sources the build reads, at the plugin folder's root.
const BACKEND_SOURCE = "main.ts";
const UI_SOURCE = "ui.ts";

export const readManifest = async (dir: string): Promise<PluginManifest> =>
	pluginManifest.parse(
		JSON.parse(await readFile(join(dir, "plugin.json"), "utf8")),
	);

const buildBackend = async (dir: string, out: string) => {
	await build({
		entryPoints: [join(dir, BACKEND_SOURCE)],
		outfile: join(dir, out),
		bundle: true,
		platform: "node",
		format: "esm",
		target: "node24",
		sourcemap: "inline",
		logLevel: "warning",
	});
};

const buildUi = async (
	dir: string,
	out: string,
	styles: string | undefined,
) => {
	// The entry re-exports the plugin's UI module and stamps the Svelte
	// version it was compiled against; the loader runs it only on that one.
	const result = await build({
		stdin: {
			contents: [
				`export * from "./${UI_SOURCE}";`,
				`export const ${svelteVersionExport} = ${JSON.stringify(VERSION)};`,
			].join("\n"),
			resolveDir: dir,
			sourcefile: "ui-entry.ts",
			loader: "ts",
		},
		outdir: join(dir, dirname(out)),
		bundle: true,
		format: "esm",
		platform: "browser",
		target: "esnext",
		write: false,
		plugins: [sharedModulesPlugin, sveltePlugin],
		logLevel: "warning",
	});
	const css = result.outputFiles.find(({ path }) => extname(path) === ".css");
	const js = result.outputFiles.find(({ path }) => extname(path) === ".js");
	if (js === undefined) throw new Error("The UI build produced no module");
	if (css !== undefined && styles === undefined) {
		throw new Error(
			'The UI module has styles; declare their file in plugin.json, for example "styles": "dist/ui.css"',
		);
	}
	await mkdir(dirname(join(dir, out)), { recursive: true });
	await writeFile(join(dir, out), js.contents);
	if (styles !== undefined) {
		await mkdir(dirname(join(dir, styles)), { recursive: true });
		await writeFile(join(dir, styles), css?.contents ?? "");
	}
};

// Builds a plugin folder's backend and UI modules to the paths its manifest
// declares (docs/spec/03-plugins.md).
export const buildPlugin = async (dir: string): Promise<PluginManifest> => {
	const manifest = await readManifest(dir);
	await Promise.all([
		manifest.main === undefined ? undefined : buildBackend(dir, manifest.main),
		manifest.ui === undefined
			? undefined
			: buildUi(dir, manifest.ui, manifest.styles),
	]);
	return manifest;
};

// The files a built plugin needs at run time, relative to its folder: what
// the build copies into the app.
export const builtFiles = (manifest: PluginManifest): string[] => [
	"plugin.json",
	...[manifest.main, manifest.ui, manifest.styles].flatMap((path) =>
		path === undefined ? [] : [path],
	),
	...manifest.contributes.panels.map(({ icon }) => icon),
];
