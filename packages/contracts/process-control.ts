import * as z from "zod";
import { logRecord } from "./log.ts";

// Messages between Electron main, the processes it forks and the preload.
// They stay outside the core protocol: main only forks processes and hands
// out ports (docs/decisions/0018-core-transport-messageport.md).

// Main to core. `start` comes first and says where the core keeps its data;
// the core answers `ready` once its database is open. A `connect` message
// carries one MessagePort: a new client. `log` forwards a line from main.
export const toCoreMessage = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("start"),
		dataDir: z.string(),
		logDir: z.string(),
		dev: z.boolean(),
	}),
	z.object({ kind: z.literal("connect") }),
	z.object({ kind: z.literal("log"), record: logRecord }),
]);

// Core to main.
export const fromCoreMessage = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("ready") }),
]);

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
export type ConnectCoreMessage = z.infer<typeof connectCoreMessage>;
export type CorePortMessage = z.infer<typeof corePortMessage>;
