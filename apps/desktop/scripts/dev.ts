// Dev mode: the Vite dev server for the renderer, esbuild watchers for main,
// preload and core, and an Electron process restarted after each rebuild.
// Arguments are passed to Electron: pnpm run dev --remote-debugging-port=9222
import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";
import { context, type Plugin } from "esbuild";
import { createServer } from "vite";
import { bundles, outDir, webRoot } from "./bundle.ts";

const server = await createServer({
	root: webRoot,
	configFile: join(webRoot, "vite.config.ts"),
});
await server.listen();
const devServerUrl = server.resolvedUrls?.local[0];
if (devServerUrl === undefined) throw new Error("Vite did not report a URL");

let electron: ChildProcess | undefined;
let restartTimer: NodeJS.Timeout | undefined;

const startElectron = () => {
	const args = [join(outDir, "main.js"), ...process.argv.slice(2)];
	const child = spawn("electron", args, {
		stdio: "inherit",
		env: { ...process.env, YAA_DEV_SERVER_URL: devServerUrl },
	});
	child.on("exit", (code, signal) => {
		// Closed by the user, not by a restart: end dev mode too.
		if (electron === child && signal === null) {
			void server.close();
			process.exit(code ?? 0);
		}
	});
	electron = child;
};

const restartElectron = () => {
	const previous = electron;
	electron = undefined;
	if (previous === undefined || previous.exitCode !== null) startElectron();
	else {
		previous.once("exit", startElectron);
		previous.kill();
	}
};

// The three bundles finish in quick succession: restart once after them.
const restartOnBuild: Plugin = {
	name: "restart-electron",
	setup(build) {
		build.onEnd((result) => {
			if (result.errors.length > 0) return;
			clearTimeout(restartTimer);
			restartTimer = setTimeout(restartElectron, 50);
		});
	},
};

const contexts = await Promise.all(
	bundles.map((options) => context({ ...options, plugins: [restartOnBuild] })),
);
await Promise.all(contexts.map((ctx) => ctx.watch()));
