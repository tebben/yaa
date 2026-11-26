// Electron main: creates the window, forks the core and hands out ports. No
// business logic lives here (docs/spec/00-overview.md).
import { join } from "node:path";
import { appOrigin } from "@yaa/contracts/app-urls";
import { ipcChannels } from "@yaa/contracts/process-control";
import {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	Menu,
	MessageChannelMain,
	type WebContents,
} from "electron";
import { registerAppScheme, serveAppScheme } from "./lib/app-protocol.ts";
import { contentSecurityPolicy } from "./lib/content-security-policy.ts";
import { type CoreProcess, startCoreProcess } from "./lib/core-process.ts";
import { createPluginHostProcess } from "./lib/plugin-host-process.ts";
import { hardenSession, openWindow } from "./lib/window.ts";

// Dev mode, set by scripts/dev.ts and scripts/smoke.ts: its own data
// folder, debug logs and the fake agent. The dev server URL, set by dev.ts
// only, loads the renderer from Vite instead of the build, and the plugins
// folder the built-in plugins from the repository.
const dev = process.env["YAA_DEV"] === "1";
const devServerUrl = process.env["YAA_DEV_SERVER_URL"];
const here = import.meta.dirname;
const pluginsDir = process.env["YAA_PLUGINS_DIR"] ?? join(here, "plugins");

// Dev mode keeps its own settings, database and logs, so a development
// build never migrates the database the installed app uses.
app.setName(dev ? "yaa-dev" : "yaa");
registerAppScheme();

const givePort = (core: CoreProcess, contents: WebContents) => {
	const { port1, port2 } = new MessageChannelMain();
	core.connect(port1);
	contents.postMessage(ipcChannels.corePort, null, [port2]);
};

app.whenReady().then(() => {
	// Replaces the default menu, so its accelerators never take app keys.
	Menu.setApplicationMenu(null);
	const policy = contentSecurityPolicy(devServerUrl);
	hardenSession(policy);
	serveAppScheme({
		renderer: devServerUrl === undefined ? join(here, "renderer") : undefined,
		plugins: pluginsDir,
	});

	const pluginHost = createPluginHostProcess({
		entry: join(here, "plugin-host.js"),
		onPort: (port) => core.connectPluginHost(port),
		log: (record) => core.log(record),
	});
	const core = startCoreProcess({
		entry: join(here, "core.js"),
		start: {
			kind: "start",
			dataDir: app.getPath("userData"),
			logDir: app.getPath("logs"),
			pluginsDir,
			// The fake agent is a dev-only provider (docs/spec/05-agents-chat.md).
			fakeAgent: dev ? join(here, "fake-agent.js") : null,
			dev,
		},
		onStartPluginHost: () => pluginHost.start(),
		onStartupFailure: (code) => {
			const log = join(app.getPath("logs"), "yaa.log");
			dialog.showErrorBox(
				"yaa could not start",
				`The core process exited during startup (code ${code}). The reason is in ${log}.`,
			);
			app.quit();
		},
	});
	core.onRestart(() => {
		// The host's port went with the old core; the new core asks for a
		// host of its own.
		pluginHost.stop();
		for (const window of BrowserWindow.getAllWindows()) {
			givePort(core, window.webContents);
		}
	});
	ipcMain.on(ipcChannels.connectCore, (event) => {
		if (event.senderFrame !== event.sender.mainFrame) return;
		givePort(core, event.sender);
	});
	app.on("will-quit", () => {
		pluginHost.stop();
		core.stop();
	});

	openWindow({
		preload: join(here, "preload.cjs"),
		url: devServerUrl ?? `${appOrigin}/index.html`,
	});
});

app.on("window-all-closed", () => app.quit());
