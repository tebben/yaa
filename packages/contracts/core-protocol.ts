import * as z from "zod";
import { keybindingsState } from "./keybindings.ts";
import { defineProtocol } from "./lib/define.ts";
import { settingsState } from "./settings.ts";

// Requests and events between the core and its clients: the renderer now,
// the plugin host from M1 step 7.
export const coreProtocol = defineProtocol({
	requests: {
		"settings.get": { params: z.object({}), result: settingsState },
		"keybindings.get": { params: z.object({}), result: keybindingsState },
		// The dock layout as the renderer serialized it. Core stores it as
		// opaque text; the renderer validates it before restoring it. One
		// layout until projects arrive in M2, which makes it per project.
		"layout.get": {
			params: z.object({}),
			result: z.object({ layout: z.string().nullable() }),
		},
		"layout.save": {
			params: z.object({ layout: z.string() }),
			result: z.object({}),
		},
	},
	events: {
		// Sent when a save changes what the file resolves to.
		"settings.changed": settingsState,
		"keybindings.changed": keybindingsState,
	},
});

export type CoreProtocol = typeof coreProtocol;
