// Production build: the renderer into dist/renderer, the Node bundles, and
// the built-in plugins into dist/plugins with only the files they run from.
import { cp } from "node:fs/promises";
import { basename, join } from "node:path";
import { buildPlugin, builtFiles } from "@yaa/plugin-build";
import { build as bundle } from "esbuild";
import { build as buildRenderer } from "vite";
import { bundles, outDir, pluginDirs, webRoot } from "./bundle.ts";

await buildRenderer({
	root: webRoot,
	configFile: join(webRoot, "vite.config.ts"),
	build: { outDir: join(outDir, "renderer"), emptyOutDir: true },
});
await Promise.all(
	bundles.map((options) => bundle({ ...options, minify: true })),
);
await Promise.all(
	pluginDirs().map(async (dir) => {
		const manifest = await buildPlugin(dir);
		const target = join(outDir, "plugins", basename(dir));
		await Promise.all(
			builtFiles(manifest).map((file) =>
				cp(join(dir, file), join(target, file)),
			),
		);
	}),
);
