import type { Disposable, PluginBackend } from "@yaa/plugin-api";
import { gitProtocol } from "./protocol.ts";

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

export const activate: PluginBackend["activate"] = ({
	serve,
	git,
	files,
	log,
}) => {
	const watches = new Map<string, Promise<Disposable>>();
	const server = serve(gitProtocol, {
		async list({ worktree }) {
			let watching = watches.get(worktree);
			if (watching === undefined) {
				watching = files.watch(worktree, () =>
					server.emit("changed", { worktree }),
				);
				watches.set(worktree, watching);
			}
			let problem: string | null = null;
			try {
				await watching;
			} catch (error) {
				watches.delete(worktree);
				problem = `Not updating on changes: ${describe(error)}`;
				log.warn("could not watch a worktree", {
					worktree,
					error: describe(error),
				});
			}
			return { changes: await git.changes(worktree), problem };
		},
		async change({ worktree, action, section, paths }) {
			await git.change(worktree, action, section, paths);
			server.emit("changed", { worktree });
			return {};
		},
		async commit({ worktree, message }) {
			await git.commit(worktree, message);
			server.emit("changed", { worktree });
			return {};
		},
	});
};
