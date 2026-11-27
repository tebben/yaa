import { homedir } from "node:os";
import { join } from "node:path";
import { coreEvent } from "@yaa/contracts/core-events";
import { createLogger, errorData, type LogRecord } from "@yaa/contracts/log";
import type { PickTarget } from "@yaa/contracts/process-control";
import type { Port } from "@yaa/contracts/protocol";
import { coreSettings } from "@yaa/contracts/settings";
import { createAgentSessions } from "./agents/agent-sessions.ts";
import { createCoreServer } from "./core-server.ts";
import { createWorktreeWatches } from "./files/worktree-watches.ts";
import { createGitService } from "./git/git-service.ts";
import { openLogFile } from "./log/log-file.ts";
import { createRecentLogs } from "./log/recent-logs.ts";
import { createPluginApiServer } from "./plugins/plugin-api-server.ts";
import { createPluginManager } from "./plugins/plugins.ts";
import { createProjects } from "./projects/projects.ts";
import { createWorktrees } from "./projects/worktrees.ts";
import { resolveKeybindings } from "./settings/resolve-keybindings.ts";
import { resolveSettings } from "./settings/resolve-settings.ts";
import { watchSettingsFile } from "./settings/watch-settings-file.ts";
import { createStateTracker } from "./state/state-tracker.ts";
import { createStepsRunner } from "./steps/worktree-steps.ts";
import { createChatStore } from "./storage/chat-store.ts";
import { openDatabase } from "./storage/database.ts";
import { createEventLog } from "./storage/event-log.ts";
import { createLayoutStore } from "./storage/layout-store.ts";
import { createPlaceStore } from "./storage/place-store.ts";
import { createPluginStore } from "./storage/plugin-store.ts";
import { createTerminals } from "./terminals/terminals.ts";

export type CoreOptions = {
	dataDir: string;
	logDir: string;
	pluginsDir: string;
	dev: boolean;
	// Asks main to fork a plugin host; its port arrives through
	// `attachPluginHost`.
	requestPluginHost(): void;
	// Shows the system's folder picker through main.
	pick(target: PickTarget): Promise<string[]>;
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
	dev,
	requestPluginHost,
	pick,
}: CoreOptions): Core => {
	const logFile = openLogFile({
		dir: logDir,
		level: dev ? "debug" : "info",
		...(dev ? { echo: (line: string) => console.log(line) } : {}),
	});
	const recentLogs = createRecentLogs();
	const write = (record: LogRecord) => {
		logFile.write(record);
		recentLogs.add(record);
	};
	const log = createLogger(write, "core");
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
		launch: (provider, cwd) => plugins.launchAgent(provider, cwd),
		permissionModes: (provider) => plugins.permissionModes(provider),
		worktree: (id) => worktree(id),
		store: createChatStore(db),
		record: states.append,
		log,
		agentLog: createLogger(write, "agent"),
		// Sessions emit only after a client starts one, once `server` exists.
		emit: (event) => server.emit("agent.event", event),
	});
	// Setup and teardown commands do not outlive the core. Main stops it with
	// SIGTERM, which would end it without the exit handlers.
	process.on("exit", steps.shutdown);
	process.on("exit", () => agents.shutdown());
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
	const terminals = createTerminals({ db, worktree, log });
	process.on("exit", terminals.shutdown);
	// A finished or settled worktree, or one of a removed project, is watched
	// no longer, and its agents and terminals end. Only a settled one keeps
	// its chats.
	const dropGone = () => {
		const all = allWorktrees();
		const listed = new Set(all.map(({ id }) => id));
		const inUse = new Set(
			all.flatMap(({ id, settled }) => (settled ? [] : [id])),
		);
		watches.keep(inUse);
		agents.keep({ listed, inUse });
		terminals.keep(inUse);
	};
	projects.onChange(dropGone);
	worktrees.onChange(dropGone);
	const pluginApi = createPluginApiServer({
		worktree,
		git,
		watches,
		store: createPluginStore(db),
		log,
	});
	const plugins = createPluginManager({
		dir: pluginsDir,
		dev,
		log,
		requestHost: requestPluginHost,
		write,
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
		recentLogs,
		settings,
		keybindings,
		layouts: createLayoutStore(db),
		place: createPlaceStore(db),
		plugins,
		agents,
		pick,
		projects,
		worktrees,
		states,
		terminals,
	});
	log.info("core started", { pid: process.pid, dataDir });

	return {
		connect: server.connect,
		attachPluginHost: plugins.attachHost,
		log: write,
	};
};
