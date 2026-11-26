import * as z from "zod";
import { agentEvent, questionAnswer, sessionEvent } from "./agent-events.ts";
import { keybindingsState } from "./keybindings.ts";
import { defineProtocol } from "./lib/define.ts";
import { pluginManifest } from "./plugin-manifest.ts";
import { settingsState } from "./settings.ts";

// Requests and events between the core and the renderer. The plugin host
// has its own protocol (plugin-host-protocol.ts).
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
		// The plugins core loaded, with what they contribute.
		"plugins.list": {
			params: z.object({}),
			result: z.object({ plugins: z.array(pluginManifest) }),
		},
		// Runs a plugin's command in the plugin host, activating it first.
		"plugins.runCommand": {
			params: z.object({ command: z.string() }),
			result: z.object({}),
		},
		// Starts an agent session. Until providers arrive in M2 the only agent
		// is the fake one, in dev mode only (docs/spec/05-agents-chat.md).
		"agent.start": {
			params: z.object({}),
			result: z.object({ sessionId: z.string() }),
		},
		// Every session with the events it has sent so far; `agent.event`
		// carries the ones that follow.
		"agent.sessions": {
			params: z.object({}),
			result: z.object({
				sessions: z.array(
					z.object({ sessionId: z.string(), events: z.array(agentEvent) }),
				),
			}),
		},
		// Starts a turn; its events arrive as `agent.event`.
		"agent.prompt": {
			params: z.object({ sessionId: z.string(), text: z.string() }),
			result: z.object({}),
		},
		"agent.cancel": {
			params: z.object({ sessionId: z.string() }),
			result: z.object({}),
		},
		"agent.answerPermission": {
			params: z.object({
				sessionId: z.string(),
				requestId: z.string(),
				optionId: z.string(),
			}),
			result: z.object({}),
		},
		"agent.answerQuestion": {
			params: z.object({
				sessionId: z.string(),
				requestId: z.string(),
				answer: questionAnswer,
			}),
			result: z.object({}),
		},
	},
	events: {
		"agent.event": sessionEvent,
		// Sent when a save changes what the file resolves to.
		"settings.changed": settingsState,
		"keybindings.changed": keybindingsState,
	},
});

export type CoreProtocol = typeof coreProtocol;
