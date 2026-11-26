import { homedir } from "node:os";
import { join } from "node:path";
import { coreEvent } from "@yaa/contracts/core-events";
import { createLogger, errorData, type LogRecord } from "@yaa/contracts/log";
import type { Port } from "@yaa/contracts/protocol";
import { coreSettings } from "@yaa/contracts/settings";
import { createAgentSessions } from "./agents/agent-sessions.ts";
import { createCoreServer } from "./core-server.ts";
import { createWorktreeWatches } from "./files/worktree-watches.ts";
import { createGitService } from "./git/git-service.ts";
import { openLogFile } from "./log/log-file.ts";
import { createPluginApiServer } from "./plugins/plugin-api-server.ts";
import { createPluginManager } from "./plugins/plugins.ts";
import { createProjects } from "./projects/projects.ts";
import { createWorktrees } from "./projects/worktrees.ts";
import { resolveKeybindings } from "./settings/resolve-keybindings.ts";
import { resolveSettings } from "./settings/resolve-settings.ts";
import { watchSettingsFile } from "./settings/watch-settings-file.ts";
import { createStateTracker } from "./state/state-tracker.ts";
import { createStepsRunner } from "./steps/worktree-steps.ts";
import { openDatabase } from "./storage/database.ts";
import { createEventLog } from "./storage/event-log.ts";
import { createLayoutStore } from "./storage/layout-store.ts";
import { createPluginStore } from "./storage/plugin-store.ts";

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
	const states = createStateTracker(createEventLog(db, coreEvent));
	states.append({ type: "core.started", pid: process.pid });
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
	const git = createGitService();
	const steps = createStepsRunner({ git, events: states, log });
	const worktrees = createWorktrees({
		db,
		git,
		settings: () => settings.current().values,
		steps,
		home: homedir(),
	});
	const agents = createAgentSessions({
		fakeAgent,
		folder: worktrees.folder,
		record: states.append,
		log,
		agentLog: createLogger(logFile.write, "agent"),
		// Sessions emit only after a client starts one, once `server` exists.
		emit: (event) => server.emit("agent.event", event),
	});
	// Setup and teardown commands do not outlive the core. Main stops it with
	// SIGTERM, which would end it without the exit handlers.
	process.on("exit", steps.shutdown);
	process.on("SIGTERM", () => process.exit(0));
	const projects = createProjects({ db, git, home: homedir() });
	const allWorktrees = () =>
		projects.list().flatMap((project) => project.worktrees);
	const worktree = (id: string) => {
		const found = allWorktrees().find((candidate) => candidate.id === id);
		if (found === undefined) throw new Error(`No worktree ${id}`);
		return found;
	};
	const watches = createWorktreeWatches({
		pathOf: (id) => worktree(id).path,
		git,
		log,
	});
	// A finished worktree, or one of a removed project, is watched no longer.
	const unwatchGone = () =>
		watches.keep(new Set(allWorktrees().map(({ id }) => id)));
	projects.onChange(unwatchGone);
	worktrees.onChange(unwatchGone);
	const pluginApi = createPluginApiServer({
		worktree,
		git,
		watches,
		store: createPluginStore(db),
		log,
	});
	const plugins = createPluginManager({
		dir: pluginsDir,
		log,
		requestHost: requestPluginHost,
		write: logFile.write,
		serve: pluginApi.connect,
		// A host runs only once a client or startup asks for a plugin, and
		// `server` exists before either hears from it.
		onEvent: (event) => server.emit("plugins.event", event),
		onLost: () => {
			watches.keep(new Set());
			server.emit("plugins.reset", {});
		},
	});
	const server = createCoreServer({
		log,
		settings,
		keybindings,
		layouts: createLayoutStore(db),
		plugins,
		agents,
		pickFolder,
		projects,
		worktrees,
		states,
	});
	log.info("core started", { pid: process.pid, dataDir });

	return {
		connect: server.connect,
		attachPluginHost: plugins.attachHost,
		log: logFile.write,
	};
};
