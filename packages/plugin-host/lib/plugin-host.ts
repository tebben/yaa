import { pathToFileURL } from "node:url";
import { createClient } from "@yaa/contracts/client";
import { createLogger, errorData } from "@yaa/contracts/log";
import {
	pluginCoreProtocol,
	pluginHostProtocol,
} from "@yaa/contracts/plugin-host-protocol";
import {
	type Port,
	type ProtocolDefinition,
	paramsSchema,
	type RequestName,
	safeParse,
	splitPort,
} from "@yaa/contracts/protocol";
import { createServer, type Handlers } from "@yaa/contracts/server";
import type { CommandHandler, PluginContext } from "@yaa/plugin-api";
import { backendModule } from "./backend-module.ts";
import { createStorageApi, createWorktreeApi } from "./worktree-api.ts";

type Service = (method: string, params: unknown) => Promise<unknown>;

// A plugin's handlers behind its protocol: the params its UI sent are
// checked before a handler sees them.
const serviceOf = <P extends ProtocolDefinition>(
	plugin: string,
	protocol: P,
	handlers: Handlers<P>,
): Service => {
	const isMethod = (method: string): method is RequestName<P> =>
		Object.hasOwn(protocol.requests, method);
	const run = async <M extends RequestName<P>>(method: M, params: unknown) => {
		const parsed = safeParse(paramsSchema(protocol, method), params);
		if (!parsed.success) throw parsed.error;
		return handlers[method](parsed.data);
	};
	return async (method, params) => {
		if (!isMethod(method)) {
			throw new Error(`Plugin ${plugin} serves no ${method}`);
		}
		return run(method, params);
	};
};

// Runs backend plugin code for the core: imports a plugin's module on its
// activation, calls the command handlers it registers and what it serves its
// UI, and gives it the plugin API, which the core answers. Plugin state
// lives in this process only, so the core can restart it after a crash.
export const startPluginHost = (port: Port) => {
	const active = new Set<string>();
	const handlers = new Map<string, CommandHandler>();
	const services = new Map<string, Service>();
	const { serving, calling } = splitPort(port);
	const core = createClient(pluginCoreProtocol);
	const api = createWorktreeApi(core);

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
			"plugin.call": async ({ id, method, params }) => {
				const service = services.get(id);
				if (service === undefined) {
					throw new Error(`Plugin ${id} serves nothing`);
				}
				return { result: await service(method, params) };
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
		serve(protocol, served) {
			if (services.has(id)) throw new Error(`Plugin ${id} serves twice`);
			const service = serviceOf(id, protocol, served);
			services.set(id, service);
			return {
				emit(event, payload) {
					server.emit("plugin.event", { plugin: id, event, payload });
				},
				dispose() {
					if (services.get(id) === service) services.delete(id);
				},
			};
		},
		...api,
		storage: createStorageApi(core, id),
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

	server.connect(serving);
	core.attach(calling);
};
