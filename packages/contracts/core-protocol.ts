import * as z from "zod";
import { keybindingsState } from "./keybindings.ts";
import { defineProtocol } from "./lib/define.ts";
import { settingsState } from "./settings.ts";

// Requests and events between the core and its clients: the renderer now,
// the plugin host from M1 step 7.
export const coreProtocol = defineProtocol({
	requests: {
		"core.info": {
			params: z.object({}),
			result: z.object({
				electron: z.string(),
				node: z.string(),
				startedAt: z.number(),
			}),
		},
		"settings.get": { params: z.object({}), result: settingsState },
		"keybindings.get": { params: z.object({}), result: keybindingsState },
	},
	events: {
		// Sent when a save changes what the file resolves to.
		"settings.changed": settingsState,
		"keybindings.changed": keybindingsState,
	},
});

export type CoreProtocol = typeof coreProtocol;
