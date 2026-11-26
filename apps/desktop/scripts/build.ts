// Production build: the renderer into dist/renderer, then the Node bundles.
import { join } from "node:path";
import { build as bundle } from "esbuild";
import { build as buildRenderer } from "vite";
import { bundles, outDir, webRoot } from "./bundle.ts";

await buildRenderer({
	root: webRoot,
	configFile: join(webRoot, "vite.config.ts"),
	build: { outDir: join(outDir, "renderer"), emptyOutDir: true },
});
await Promise.all(
	bundles.map((options) => bundle({ ...options, minify: true })),
);
