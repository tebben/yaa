import { pluginFileUrl } from "@yaa/contracts/app-urls";
import type { PluginManifest } from "@yaa/contracts/plugin-manifest";
import type { PluginUi } from "@yaa/plugin-api/ui";
import { version as svelteVersion } from "svelte/package.json";
import * as z from "zod";

const isFunction = (value: unknown) => typeof value === "function";

// A plugin's built UI module. Only that each panel is a function can be
// checked; that it is a component is the plugin build's promise.
const uiModule = z.object({
	svelteVersion: z.string(),
	panels: z.record(
		z.string(),
		z.custom<PluginUi["panels"][string]>(isFunction, "Expected a component"),
	),
});

export type PluginUiModule = z.infer<typeof uiModule>;

const loadStylesheet = (href: string) =>
	new Promise<void>((resolve, reject) => {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = href;
		link.onload = () => resolve();
		link.onerror = () => reject(new Error(`Could not load ${href}`));
		document.head.append(link);
	});

// Imports a plugin's UI module and its styles. It runs only on the Svelte it
// was built with: compiled components call Svelte's internals, which change
// between releases (docs/decisions/0015-plugin-ui-loading.md).
export const loadPluginUi = async ({
	id,
	ui,
	styles,
}: PluginManifest): Promise<PluginUiModule> => {
	if (ui === undefined) throw new Error(`Plugin ${id} has no UI module`);
	const module = uiModule.parse(
		await import(/* @vite-ignore */ pluginFileUrl(id, ui)),
	);
	if (module.svelteVersion !== svelteVersion) {
		throw new Error(
			`Plugin ${id} was built with Svelte ${module.svelteVersion} and the app runs ${svelteVersion}. Rebuild it with yaa-plugin-build, or pnpm run plugins:build for the built-in plugins.`,
		);
	}
	if (styles !== undefined) await loadStylesheet(pluginFileUrl(id, styles));
	return module;
};
