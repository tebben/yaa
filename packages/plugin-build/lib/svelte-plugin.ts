import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { type Plugin, transform } from "esbuild";
import { compile, compileModule } from "svelte/compiler";

const cssNamespace = "svelte-css";

// The compiler's warnings about the plugin's own code; a library's are its
// authors' to act on.
const report = (path: string, warnings: readonly { message: string }[]) =>
	path.includes("/node_modules/")
		? []
		: warnings.map(({ message }) => ({ text: message }));

// Compiles .svelte components and .svelte.ts modules for the app's runtime:
// runes mode, no version beacon, and each component's scoped <style> as a
// CSS module, which esbuild gathers into the plugin's one CSS file.
export const sveltePlugin: Plugin = {
	name: "yaa-svelte",
	setup(build) {
		const styles = new Map<string, string>();

		build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
			const source = await readFile(path, "utf8");
			const { js, css, warnings } = compile(source, {
				filename: path,
				generate: "client",
				css: "external",
				runes: true,
				discloseVersion: false,
			});
			let contents = js.code;
			if (css !== null && css.code !== "") {
				// Relative, so the comment esbuild writes above it in the CSS
				// file names no folder on the build machine.
				const id = `${relative(process.cwd(), path)}.css`;
				styles.set(id, css.code);
				contents += `\nimport ${JSON.stringify(id)};`;
			}
			return { contents, loader: "js", warnings: report(path, warnings) };
		});

		build.onResolve({ filter: /\.svelte\.css$/ }, ({ path }) => ({
			path,
			namespace: cssNamespace,
		}));
		build.onLoad({ filter: /.*/, namespace: cssNamespace }, ({ path }) => ({
			contents: styles.get(path) ?? "",
			loader: "css",
		}));

		build.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
			const source = await readFile(path, "utf8");
			const { code } = await transform(source, { loader: "ts" });
			const { js, warnings } = compileModule(code, {
				filename: path,
				generate: "client",
			});
			return {
				contents: js.code,
				loader: "js",
				warnings: report(path, warnings),
			};
		});
	},
};
