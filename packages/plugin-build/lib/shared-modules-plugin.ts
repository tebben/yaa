import {
	type SharedModule,
	sharedModules,
	sharedModulesKey,
} from "@yaa/contracts/plugin-ui";
import type { Plugin } from "esbuild";

const namespace = "yaa-shared";
const shared: ReadonlySet<string> = new Set(sharedModules);
const isShared = (path: string): path is SharedModule => shared.has(path);

// Svelte and @yaa/ui are the app's: a plugin's imports of them become reads
// from the app's registry of real namespaces, so the plugin runs on the
// app's single runtime. A CommonJS stub keeps the bindings live: esbuild
// reads each export through a getter on the real namespace
// (docs/decisions/0015-plugin-ui-loading.md).
export const sharedModulesPlugin: Plugin = {
	name: "yaa-shared-modules",
	setup(build) {
		build.onResolve(
			{ filter: /^(?:svelte(?:\/.*)?|@yaa\/ui(?:\/.*)?)$/ },
			({ path }) =>
				isShared(path)
					? { path, namespace }
					: {
							errors: [
								{
									text: `${path} is not shared with plugins. Shared modules: ${sharedModules.join(", ")}`,
								},
							],
						},
		);
		build.onLoad({ filter: /.*/, namespace }, ({ path }) => ({
			contents: [
				`const shared = globalThis[${JSON.stringify(sharedModulesKey)}]?.[${JSON.stringify(path)}];`,
				`if (shared === undefined) throw new Error(${JSON.stringify(`The app does not share ${path}`)});`,
				"module.exports = shared;",
			].join("\n"),
			loader: "js",
		}));
	},
};
