// Electron main: creates the window, forks the core and hands out ports. No
// business logic lives here (docs/spec/00-overview.md).
import { join } from "node:path";
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
import {
	appOrigin,
	registerAppScheme,
	serveRenderer,
} from "./lib/app-protocol.ts";
import { contentSecurityPolicy } from "./lib/content-security-policy.ts";
import { type CoreProcess, startCoreProcess } from "./lib/core-process.ts";
import { hardenSession, openWindow } from "./lib/window.ts";

// Set by scripts/dev.ts: load the Vite dev server instead of the build.
const devServerUrl = process.env["YAA_DEV_SERVER_URL"];
const here = import.meta.dirname;

// Dev mode keeps its own settings, database and logs, so a development
// build never migrates the database the installed app uses.
app.setName(devServerUrl === undefined ? "yaa" : "yaa-dev");
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
	if (devServerUrl === undefined) serveRenderer(join(here, "renderer"));

	const core = startCoreProcess({
		entry: join(here, "core.js"),
		start: {
			kind: "start",
			dataDir: app.getPath("userData"),
			logDir: app.getPath("logs"),
			dev: devServerUrl !== undefined,
		},
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
		for (const window of BrowserWindow.getAllWindows()) {
			givePort(core, window.webContents);
		}
	});
	ipcMain.on(ipcChannels.connectCore, (event) => {
		if (event.senderFrame !== event.sender.mainFrame) return;
		givePort(core, event.sender);
	});
	app.on("will-quit", () => core.stop());

	openWindow({
		preload: join(here, "preload.cjs"),
		url: devServerUrl ?? `${appOrigin}/index.html`,
	});
});

app.on("window-all-closed", () => app.quit());
