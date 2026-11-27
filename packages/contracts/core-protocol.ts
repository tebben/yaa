import * as z from "zod";
import {
	agentEvent,
	promptAttachment,
	questionAnswer,
	sessionEvent,
} from "./agent-events.ts";
import { keybindingsState } from "./keybindings.ts";
import { defineProtocol } from "./lib/define.ts";
import { pluginEvent } from "./plugin-host-protocol.ts";
import { pluginId, pluginManifest } from "./plugin-manifest.ts";
import {
	addProjectResult,
	branchStatus,
	createWorktreeResult,
	finishAction,
	finishCheck,
	place,
	project,
} from "./projects.ts";
import { providerStatus } from "./providers.ts";
import { settingChange, settingsState } from "./settings.ts";
import {
	terminal,
	terminalOutput,
	terminalProgress,
	terminalSize,
	terminalSnapshot,
	terminalView,
} from "./terminals.ts";
import { worktreeState } from "./worktree-state.ts";

// The state of each worktree by its id; one that is not listed is idle.
const worktreeStates = z.object({
	states: z.record(z.string(), worktreeState),
});

// Requests and events between the core and the renderer. The plugin host
// has its own protocol (plugin-host-protocol.ts).
export const coreProtocol = defineProtocol({
	requests: {
		"settings.get": { params: z.object({}), result: settingsState },
		// Writes one setting to settings.json; its default takes it out. Rejects
		// a value its schema rejects, and a file that does not parse, which it
		// leaves for the user to fix.
		"settings.set": { params: settingChange, result: z.object({}) },
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
		// Where the window was when it last moved, to open there again; null
		// before it first did.
		"place.get": {
			params: z.object({}),
			result: z.object({ place: place.nullable() }),
		},
		"place.save": { params: place, result: z.object({}) },
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
		// The same dialog for files, any number of them; none when cancelled.
		"dialog.pickFiles": {
			params: z.object({}),
			result: z.object({ paths: z.array(z.string()) }),
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
		// Puts a settled worktree back in use; refused when its folder is gone.
		"worktrees.reopen": {
			params: z.object({ id: z.string() }),
			result: z.object({ problem: z.string().optional() }),
		},
		// The states derived from core's events; `worktrees.statesChanged`
		// carries them again after each change.
		"worktrees.states": { params: z.object({}), result: worktreeStates },
		// Marks a worktree done, ready to finish, or takes the mark off.
		"worktrees.setDone": {
			params: z.object({ id: z.string(), done: z.boolean() }),
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
		// A request from a plugin's UI to its backend, activating it first.
		"plugins.call": {
			params: z.object({
				plugin: pluginId,
				method: z.string(),
				params: z.unknown(),
			}),
			result: z.object({ result: z.unknown() }),
		},
		// A worktree's terminals, oldest first; `terminals.changed` carries
		// them again after each change.
		"terminals.list": {
			params: z.object({ worktree: z.string() }),
			result: z.object({ terminals: z.array(terminal) }),
		},
		// A new terminal in the worktree's folder. Its shell starts when a view
		// first attaches.
		"terminals.create": {
			params: z.object({ worktree: z.string() }),
			result: z.object({ id: z.string() }),
		},
		// Ends the terminal's program and takes it off the list.
		"terminals.close": {
			params: z.object({ id: z.string() }),
			result: z.object({}),
		},
		// Attaches a view, sized as it is: the reply is what is on the terminal,
		// and `terminals.output` carries what follows its offset. A view goes
		// with the connection it was attached on.
		"terminals.attach": {
			params: terminalView.extend(terminalSize.shape),
			result: terminalSnapshot,
		},
		"terminals.detach": { params: terminalView, result: z.object({}) },
		// The view has shown the output up to `offset`.
		"terminals.ack": { params: terminalProgress, result: z.object({}) },
		// Input for the terminal's program.
		"terminals.write": {
			params: z.object({ id: z.string(), data: z.string() }),
			result: z.object({}),
		},
		"terminals.resize": {
			params: terminalSize.extend({ id: z.string() }),
			result: z.object({}),
		},
		// Whether a chat can start with a provider a plugin contributes, checked
		// anew on each call.
		"providers.status": {
			params: z.object({ provider: z.string() }),
			result: providerStatus,
		},
		// Starts the provider's agent in a worktree, with a session on it.
		"agent.start": {
			params: z.object({ worktree: z.string(), provider: z.string() }),
			result: z.object({ sessionId: z.string() }),
		},
		// Every session with the events it has sent so far; `agent.event`
		// carries the ones that follow.
		"agent.sessions": {
			params: z.object({}),
			result: z.object({
				sessions: z.array(
					z.object({
						sessionId: z.string(),
						worktree: z.string(),
						provider: z.string(),
						events: z.array(agentEvent),
					}),
				),
			}),
		},
		// Starts a turn; its events arrive as `agent.event`.
		"agent.prompt": {
			params: z.object({
				sessionId: z.string(),
				text: z.string(),
				attachments: z.array(promptAttachment),
			}),
			result: z.object({}),
		},
		// Sets one of the session's config options, such as its model; the
		// options as they are then arrive as a `config` event.
		"agent.setConfig": {
			params: z.object({
				sessionId: z.string(),
				configId: z.string(),
				value: z.string(),
			}),
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
		"terminals.output": terminalOutput,
		"terminals.changed": z.object({
			worktree: z.string(),
			terminals: z.array(terminal),
		}),
		"plugins.event": pluginEvent,
		// The plugin host went away: what plugin backends held, such as file
		// watches, went with it.
		"plugins.reset": z.object({}),
		// Sent when a save changes what the file resolves to.
		"settings.changed": settingsState,
		"keybindings.changed": keybindingsState,
		"projects.changed": z.object({ projects: z.array(project) }),
		"worktrees.statesChanged": worktreeStates,
	},
});

export type CoreProtocol = typeof coreProtocol;
