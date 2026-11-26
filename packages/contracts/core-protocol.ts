import * as z from "zod";
import { defineProtocol } from "./lib/define.ts";

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
	},
	events: {},
});

export type CoreProtocol = typeof coreProtocol;
