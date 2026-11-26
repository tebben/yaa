// The files plugin's backend: lists a worktree's files for the panel, tells
// it when they change, and creates, renames and deletes them.
import type { Disposable, PluginBackend } from "@yaa/plugin-api";
import { filesProtocol } from "./protocol.ts";

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

export const activate: PluginBackend["activate"] = ({
	serve,
	git,
	files,
	log,
}) => {
	const watches = new Map<string, Promise<Disposable>>();

	// Watched from the first listing on; a failed watch is tried again with
	// the next one.
	const watch = async (worktree: string): Promise<string | null> => {
		let watching = watches.get(worktree);
		if (watching === undefined) {
			watching = files.watch(worktree, () =>
				server.emit("changed", { worktree }),
			);
			watches.set(worktree, watching);
		}
		try {
			await watching;
			return null;
		} catch (error) {
			watches.delete(worktree);
			log.warn("could not watch a worktree", {
				worktree,
				error: describe(error),
			});
			return `Not updating on changes: ${describe(error)}`;
		}
	};

	const server = serve(filesProtocol, {
		async list({ worktree, ignored }) {
			// Watching first, so a change during the listing is not missed.
			const problem = await watch(worktree);
			const [listed, changes, ignoredPaths] = await Promise.all([
				git.files(worktree),
				git.changes(worktree),
				ignored ? git.ignored(worktree) : [],
			]);
			return { ...listed, changes, ignored: ignoredPaths, problem };
		},
		readDir: async ({ worktree, path }) => ({
			entries: await files.readDir(worktree, path),
		}),
		async create({ worktree, path }) {
			await files.create(worktree, path);
			return {};
		},
		async rename({ worktree, from, to }) {
			await files.rename(worktree, from, to);
			return {};
		},
		async remove({ worktree, path }) {
			await files.remove(worktree, path);
			return {};
		},
	});
};
