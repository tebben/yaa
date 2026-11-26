import { pathToFileURL } from "node:url";
import { createLogger, errorData } from "@yaa/contracts/log";
import { pluginHostProtocol } from "@yaa/contracts/plugin-host-protocol";
import type { Port } from "@yaa/contracts/protocol";
import { createServer } from "@yaa/contracts/server";
import type { CommandHandler, PluginContext } from "@yaa/plugin-api";
import { backendModule } from "./backend-module.ts";

// Runs backend plugin code for the core: imports a plugin's module on its
// activation and calls the command handlers it registers. Plugin state
// lives in this process only, so the core can restart it after a crash.
export const startPluginHost = (port: Port) => {
	const active = new Set<string>();
	const handlers = new Map<string, CommandHandler>();

	const server = createServer(
		pluginHostProtocol,
		{
			"plugin.activate": async ({ id, main, commands }) => {
				if (active.has(id)) throw new Error(`Plugin ${id} is already active`);
				// Marked first: a plugin whose activate throws stays failed until
				// the host restarts, rather than registering twice on a retry.
				active.add(id);
				const module = backendModule.parse(
					await import(pathToFileURL(main).href),
				);
				await module.activate(context(id, new Set(commands)));
				return {};
			},
			"command.run": async ({ command }) => {
				const handler = handlers.get(command);
				if (handler === undefined) {
					throw new Error(`No handler is registered for ${command}`);
				}
				await handler();
				return {};
			},
		},
		{
			onError: (error) => log.error("plugin request failed", errorData(error)),
		},
	);
	const log = createLogger(
		(record) => server.emit("log", record),
		"plugin-host",
	);

	const context = (id: string, declared: Set<string>): PluginContext => ({
		id,
		commands: {
			register(command, handler) {
				if (!declared.has(command)) {
					throw new Error(
						`Plugin ${id} registered ${command}, which its manifest does not contribute`,
					);
				}
				if (handlers.has(command)) {
					throw new Error(`Command ${command} is registered twice`);
				}
				handlers.set(command, handler);
				return {
					dispose() {
						if (handlers.get(command) === handler) handlers.delete(command);
					},
				};
			},
		},
		log: createLogger(
			(record) =>
				server.emit("log", {
					...record,
					data: { plugin: id, ...record.data },
				}),
			"plugin-host",
		),
	});

	// Plugin code that throws outside a request leaves the host in an unknown
	// state: logged, then fatal, and the core starts a new host.
	process.on("uncaughtException", (error) => {
		log.error("uncaught exception in the plugin host", errorData(error));
		console.error(error);
		setImmediate(() => process.exit(1));
	});

	server.connect(port);
};
