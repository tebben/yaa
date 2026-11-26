import * as z from "zod";
import { defineProtocol } from "./lib/define.ts";
import { logRecord } from "./log.ts";
import { pluginId } from "./plugin-manifest.ts";
import { worktree } from "./projects.ts";
import { dirEntry, gitChange, gitFiles } from "./worktree-files.ts";

// An event a plugin's backend sends its UI.
export const pluginEvent = z.object({
	plugin: pluginId,
	event: z.string(),
	payload: z.unknown(),
});

// Requests from core to the plugin host, which serves them, the events its
// plugins send their UI, and the host's log lines, which core writes to the
// log file (docs/spec/03-plugins.md, Process model). The same port carries
// pluginCoreProtocol the other way.
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
		// A request from a plugin's UI to what its backend serves. The
		// plugin's own protocol types `params` and `result`.
		"plugin.call": {
			params: z.object({
				id: pluginId,
				method: z.string(),
				params: z.unknown(),
			}),
			result: z.object({ result: z.unknown() }),
		},
	},
	events: {
		log: logRecord,
		"plugin.event": pluginEvent,
	},
});

export type PluginHostProtocol = typeof pluginHostProtocol;
export type PluginEvent = z.infer<typeof pluginEvent>;

const inWorktree = { worktree: z.string() };
const atPath = { ...inWorktree, path: z.string() };
const done = z.object({});

// Requests from the plugin host to core: what the plugin API reads and does
// in a worktree. Paths are relative to the worktree's folder, with `/`.
export const pluginCoreProtocol = defineProtocol({
	requests: {
		"worktrees.get": {
			params: z.object({ id: z.string() }),
			result: worktree,
		},
		"git.files": { params: z.object(inWorktree), result: gitFiles },
		"git.ignored": {
			params: z.object(inWorktree),
			result: z.object({ paths: z.array(z.string()) }),
		},
		"git.changes": {
			params: z.object(inWorktree),
			result: z.object({ changes: z.array(gitChange) }),
		},
		"files.readDir": {
			params: z.object(atPath),
			result: z.object({ entries: z.array(dirEntry) }),
		},
		"files.create": { params: z.object(atPath), result: done },
		"files.rename": {
			params: z.object({ ...inWorktree, from: z.string(), to: z.string() }),
			result: done,
		},
		"files.remove": { params: z.object(atPath), result: done },
		// `files.changed` follows for a watched worktree until it is unwatched.
		"files.watch": { params: z.object(inWorktree), result: done },
		"files.unwatch": { params: z.object(inWorktree), result: done },
	},
	events: {
		"files.changed": z.object(inWorktree),
	},
});

export type PluginCoreProtocol = typeof pluginCoreProtocol;
