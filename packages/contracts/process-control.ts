import * as z from "zod";
import { logRecord } from "./log.ts";

// Messages between Electron main, the processes it forks and the preload.
// They stay outside the core protocol: main only forks processes and hands
// out ports (docs/decisions/0018-core-transport-messageport.md).

// Main to core. `start` comes first and says where the core keeps its data
// and finds the built-in plugins and, in dev mode, the fake agent's script
// (docs/spec/05-agents-chat.md); the core answers `ready` once its database
// is open. A `connect` message carries one MessagePort: a new client.
// `plugin-host` carries the port to a plugin host main forked on the core's
// request. `log` forwards a line from main. `picked-folder` answers the
// core's `pick-folder` with the same id: the folder chosen, or null when the
// dialog was cancelled.
export const toCoreMessage = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("start"),
		dataDir: z.string(),
		logDir: z.string(),
		pluginsDir: z.string(),
		fakeAgent: z.string().nullable(),
		dev: z.boolean(),
	}),
	z.object({ kind: z.literal("connect") }),
	z.object({ kind: z.literal("plugin-host") }),
	z.object({ kind: z.literal("log"), record: logRecord }),
	z.object({
		kind: z.literal("picked-folder"),
		id: z.number().int(),
		path: z.string().nullable(),
	}),
]);

// Core to main. The core's supervisor decides when the plugin host starts
// and restarts; `start-plugin-host` asks main to fork a new one, replacing
// any host still running. `pick-folder` asks main for the system's folder
// picker, which only main can show.
export const fromCoreMessage = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("ready") }),
	z.object({ kind: z.literal("start-plugin-host") }),
	z.object({ kind: z.literal("pick-folder"), id: z.number().int() }),
]);

// Main to the plugin host: the one message, carrying its port to the core.
export const toPluginHostMessage = z.object({ kind: z.literal("connect") });

// Between the page and its preload, over window.postMessage. The page asks
// once per load; the preload answers with a port, and again with a new port
// whenever the core restarts.
export const connectCoreMessage = z.object({
	kind: z.literal("yaa:connect-core"),
});
export const corePortMessage = z.object({ kind: z.literal("yaa:core-port") });

// IPC channels between the preload and main.
export const ipcChannels = {
	connectCore: "core:connect",
	corePort: "core:port",
} as const;

export type ToCoreMessage = z.infer<typeof toCoreMessage>;
export type FromCoreMessage = z.infer<typeof fromCoreMessage>;
export type ToPluginHostMessage = z.infer<typeof toPluginHostMessage>;
export type ConnectCoreMessage = z.infer<typeof connectCoreMessage>;
export type CorePortMessage = z.infer<typeof corePortMessage>;
