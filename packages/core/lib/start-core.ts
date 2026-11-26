import { homedir } from "node:os";
import { join } from "node:path";
import { coreEvent } from "@yaa/contracts/core-events";
import { createLogger, errorData, type LogRecord } from "@yaa/contracts/log";
import type { Port } from "@yaa/contracts/protocol";
import { coreSettings } from "@yaa/contracts/settings";
import { createAgentSessions } from "./agents/agent-sessions.ts";
import { createCoreServer } from "./core-server.ts";
import { createGitService } from "./git/git-service.ts";
import { openLogFile } from "./log/log-file.ts";
import { createPluginManager } from "./plugins/plugins.ts";
import { createProjects } from "./projects/projects.ts";
import { resolveKeybindings } from "./settings/resolve-keybindings.ts";
import { resolveSettings } from "./settings/resolve-settings.ts";
import { watchSettingsFile } from "./settings/watch-settings-file.ts";
import { openDatabase } from "./storage/database.ts";
import { createEventLog } from "./storage/event-log.ts";
import { createLayoutStore } from "./storage/layout-store.ts";

export type CoreOptions = {
	dataDir: string;
	logDir: string;
	pluginsDir: string;
	// The fake agent's script, or null outside dev mode.
	fakeAgent: string | null;
	dev: boolean;
	// Asks main to fork a plugin host; its port arrives through
	// `attachPluginHost`.
	requestPluginHost(): void;
	// Shows the system's folder picker through main.
	pickFolder(): Promise<string | null>;
};

export type Core = {
	connect(port: Port): void;
	attachPluginHost(port: Port): void;
	// A line logged by another process.
	log(record: LogRecord): void;
};

export const startCore = ({
	dataDir,
	logDir,
	pluginsDir,
	fakeAgent,
	dev,
	requestPluginHost,
	pickFolder,
}: CoreOptions): Core => {
	const logFile = openLogFile({
		dir: logDir,
		level: dev ? "debug" : "info",
		...(dev ? { echo: (line: string) => console.log(line) } : {}),
	});
	const log = createLogger(logFile.write, "core");
	// Logged, then fatal: main forks a new core.
	process.on("uncaughtException", (error) => {
		log.error("uncaught exception", errorData(error));
		process.exit(1);
	});

	const db = openDatabase(join(dataDir, "yaa.db"));
	const events = createEventLog(db, coreEvent);
	events.append({ type: "core.started", pid: process.pid });
	const settings = watchSettingsFile({
		dir: dataDir,
		name: "settings.json",
		resolve: (text) => resolveSettings(coreSettings, text),
		log,
	});
	const keybindings = watchSettingsFile({
		dir: dataDir,
		name: "keybindings.json",
		resolve: resolveKeybindings,
		log,
	});
	const plugins = createPluginManager({
		dir: pluginsDir,
		log,
		requestHost: requestPluginHost,
		write: logFile.write,
	});
	const agents = createAgentSessions({
		fakeAgent,
		// No worktrees before M2; the fake agent touches no files.
		cwd: dataDir,
		log,
		agentLog: createLogger(logFile.write, "agent"),
		// Sessions emit only after a client starts one, once `server` exists.
		emit: (event) => server.emit("agent.event", event),
	});
	const server = createCoreServer({
		log,
		settings,
		keybindings,
		layouts: createLayoutStore(db),
		plugins,
		agents,
		pickFolder,
		projects: createProjects({
			db,
			git: createGitService(),
			home: homedir(),
		}),
	});
	log.info("core started", { pid: process.pid, dataDir });

	return {
		connect: server.connect,
		attachPluginHost: plugins.attachHost,
		log: logFile.write,
	};
};
