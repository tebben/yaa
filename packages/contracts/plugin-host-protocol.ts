import * as z from "zod";
import { defineProtocol } from "./lib/define.ts";
import { logRecord } from "./log.ts";
import { pluginId } from "./plugin-manifest.ts";

// Requests from core to the plugin host, which serves them, and the host's
// log lines, which core writes to the log file
// (docs/spec/03-plugins.md, Process model).
export const pluginHostProtocol = defineProtocol({
	requests: {
		// Imports the backend module, an absolute path, and runs its activate.
		// `commands` are the ones the manifest contributes: the only ones the
		// plugin may register handlers for.
		"plugin.activate": {
			params: z.object({
				id: pluginId,
				main: z.string(),
				commands: z.array(z.string()),
			}),
			result: z.object({}),
		},
		"command.run": {
			params: z.object({ command: z.string() }),
			result: z.object({}),
		},
	},
	events: {
		log: logRecord,
	},
});

export type PluginHostProtocol = typeof pluginHostProtocol;
