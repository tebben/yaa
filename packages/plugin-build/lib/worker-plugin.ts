import type { Plugin } from "esbuild";

const namespace = "yaa-worker";
const SUFFIX = /\?worker$/;

// `import start from "<module>?worker"`: the module is bundled into the UI
// module as a worker's source, and `start` runs it in a new worker. A page
// cannot start a worker straight from the plugin's origin, so it starts
// from a blob URL.
export const workerPlugin: Plugin = {
	name: "yaa-worker",
	setup({ onResolve, onLoad, resolve, esbuild }) {
		onResolve({ filter: SUFFIX }, async ({ path, resolveDir, kind }) => {
			const found = await resolve(path.replace(SUFFIX, ""), {
				resolveDir,
				kind,
			});
			return found.errors.length > 0
				? { errors: found.errors }
				: { path: found.path, namespace };
		});
		onLoad({ filter: /.*/, namespace }, async ({ path }) => {
			const result = await esbuild.build({
				entryPoints: [path],
				bundle: true,
				format: "iife",
				platform: "browser",
				target: "esnext",
				minify: true,
				write: false,
				logLevel: "silent",
			});
			const source = result.outputFiles[0]?.text;
			if (source === undefined) throw new Error(`No worker built from ${path}`);
			return {
				contents: [
					`const source = ${JSON.stringify(source)};`,
					"let url;",
					"export default () => {",
					'	url ??= URL.createObjectURL(new Blob([source], { type: "text/javascript" }));',
					"	return new Worker(url);",
					"};",
				].join("\n"),
				loader: "js",
				warnings: result.warnings,
			};
		});
	},
};
