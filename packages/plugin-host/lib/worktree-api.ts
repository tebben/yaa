import type { Client } from "@yaa/contracts/client";
import type { PluginCoreProtocol } from "@yaa/contracts/plugin-host-protocol";
import type { PluginContext } from "@yaa/plugin-api";

// The parts of the plugin API the core answers, the same for every plugin.
export const createWorktreeApi = (
	core: Client<PluginCoreProtocol>,
): Pick<PluginContext, "worktrees" | "git" | "files"> => {
	// One core watch per worktree, however many listen.
	const listeners = new Map<string, Set<() => void>>();
	core.subscribe("files.changed", ({ worktree }) => {
		for (const listener of listeners.get(worktree) ?? []) listener();
	});

	return {
		worktrees: {
			get: (id) => core.request("worktrees.get", { id }),
		},
		git: {
			files: (worktree) => core.request("git.files", { worktree }),
			ignored: async (worktree) =>
				(await core.request("git.ignored", { worktree })).paths,
			changes: async (worktree) =>
				(await core.request("git.changes", { worktree })).changes,
		},
		files: {
			readDir: async (worktree, path) =>
				(await core.request("files.readDir", { worktree, path })).entries,
			async create(worktree, path) {
				await core.request("files.create", { worktree, path });
			},
			async rename(worktree, from, to) {
				await core.request("files.rename", { worktree, from, to });
			},
			async remove(worktree, path) {
				await core.request("files.remove", { worktree, path });
			},
			async watch(worktree, listener) {
				const watching = listeners.get(worktree) ?? new Set();
				listeners.set(worktree, watching);
				// Its own function, so one listener passed twice counts twice.
				const entry = () => listener();
				watching.add(entry);
				const dispose = () => {
					if (!watching.delete(entry) || watching.size > 0) return;
					listeners.delete(worktree);
					core.request("files.unwatch", { worktree }).catch(() => {
						// The core went away, and its watches with it.
					});
				};
				try {
					await core.request("files.watch", { worktree });
				} catch (error) {
					dispose();
					throw error;
				}
				return { dispose };
			},
		},
	};
};
