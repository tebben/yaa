import * as z from "zod";
import { agentEvent, questionAnswer, sessionEvent } from "./agent-events.ts";
import { keybindingsState } from "./keybindings.ts";
import { defineProtocol } from "./lib/define.ts";
import { pluginManifest } from "./plugin-manifest.ts";
import {
	addProjectResult,
	branchStatus,
	createWorktreeResult,
	finishAction,
	finishCheck,
	project,
} from "./projects.ts";
import { settingsState } from "./settings.ts";

// Requests and events between the core and the renderer. The plugin host
// has its own protocol (plugin-host-protocol.ts).
export const coreProtocol = defineProtocol({
	requests: {
		"settings.get": { params: z.object({}), result: settingsState },
		"keybindings.get": { params: z.object({}), result: keybindingsState },
		// A worktree's dock layout as the renderer serialized it. Core stores
		// it as opaque text; the renderer validates it before restoring it.
		"layout.get": {
			params: z.object({ worktree: z.string() }),
			result: z.object({ layout: z.string().nullable() }),
		},
		"layout.save": {
			params: z.object({ worktree: z.string(), layout: z.string() }),
			result: z.object({}),
		},
		// The project list in the order projects were added;
		// `projects.changed` carries it again after each change.
		"projects.list": {
			params: z.object({}),
			result: z.object({ projects: z.array(project) }),
		},
		// Adds the repository holding the folder, by its main checkout. A
		// leading ~ is the home folder.
		"projects.add": {
			params: z.object({ path: z.string() }),
			result: addProjectResult,
		},
		// The system's folder picker, shown by Electron main: the folder
		// chosen, or null when cancelled.
		"dialog.pickFolder": {
			params: z.object({}),
			result: z.object({ path: z.string().nullable() }),
		},
		// Takes the project off the list; its folder stays as it is.
		"projects.remove": {
			params: z.object({ id: z.string() }),
			result: z.object({}),
		},
		// The project's local branches, then its remote ones as
		// `<remote>/<branch>`, each in name order.
		"projects.branches": {
			params: z.object({ id: z.string() }),
			result: z.object({ branches: z.array(z.string()) }),
		},
		// Creates a worktree from `base`. With a name, `text` goes through the
		// naming strategy into a new branch; empty, the worktree checks out
		// `base` itself, a remote branch as a local one that tracks it.
		"worktrees.create": {
			params: z.object({
				project: z.string(),
				text: z.string(),
				base: z.string(),
			}),
			result: createWorktreeResult,
		},
		"worktrees.status": {
			params: z.object({ id: z.string() }),
			result: branchStatus,
		},
		// What finishing would lose, for the warnings before it.
		"worktrees.finishCheck": {
			params: z.object({ id: z.string() }),
			result: finishCheck,
		},
		// `force` removes a folder with uncommitted changes and deletes a
		// branch with unpushed commits. Once the folder is gone the worktree
		// is off the list, even when deleting a branch then fails.
		"worktrees.finish": {
			params: z.object({
				id: z.string(),
				action: finishAction,
				force: z.boolean(),
			}),
			result: z.object({ problem: z.string().optional() }),
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
		"projects.changed": z.object({ projects: z.array(project) }),
	},
});

export type CoreProtocol = typeof coreProtocol;
