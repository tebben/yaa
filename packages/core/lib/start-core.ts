import { join } from "node:path";
import { coreEvent } from "@yaa/contracts/core-events";
import type { LogRecord } from "@yaa/contracts/log";
import type { Port } from "@yaa/contracts/protocol";
import { coreSettings } from "@yaa/contracts/settings";
import { createCoreServer } from "./core-server.ts";
import { openLogFile } from "./log/log-file.ts";
import { createLogger, errorData } from "./log/logger.ts";
import { resolveKeybindings } from "./settings/resolve-keybindings.ts";
import { resolveSettings } from "./settings/resolve-settings.ts";
import { watchSettingsFile } from "./settings/watch-settings-file.ts";
import { openDatabase } from "./storage/database.ts";
import { createEventLog } from "./storage/event-log.ts";

export type CoreOptions = { dataDir: string; logDir: string; dev: boolean };

export type Core = {
	connect(port: Port): void;
	// A line logged by another process.
	log(record: LogRecord): void;
};

export const startCore = ({ dataDir, logDir, dev }: CoreOptions): Core => {
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
	const server = createCoreServer({ log, settings, keybindings });
	log.info("core started", { pid: process.pid, dataDir });

	return { connect: server.connect, log: logFile.write };
};
