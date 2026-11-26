import type { PluginBackend } from "@yaa/plugin-api";
import * as z from "zod";

const isFunction = (value: unknown) => typeof value === "function";

// A plugin's backend module as the host imported it. Only the export's
// presence can be checked: its signature is the plugin's promise.
export const backendModule = z.object({
	activate: z.custom<PluginBackend["activate"]>(
		isFunction,
		"Expected the backend module to export an activate function",
	),
});
