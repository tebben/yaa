import { errorData, type Logger } from "@yaa/contracts/log";
import { type TreeWatcher, watchTree } from "./watch-tree.ts";

export type WorktreeWatches = {
	// Resolves once changes are seen. Watching a watched worktree does
	// nothing more.
	watch(worktree: string): Promise<void>;
	unwatch(worktree: string): void;
	// Unwatches every worktree that is not in `worktrees`.
	keep(worktrees: ReadonlySet<string>): void;
	onChange(listener: (worktree: string) => void): void;
};

type WatchesOptions = {
	pathOf(worktree: string): string;
	git: {
		gitDir(dir: string): Promise<string>;
		ignored(dir: string): Promise<string[]>;
	};
	log: Logger;
};

export const createWorktreeWatches = ({
	pathOf,
	git,
	log,
}: WatchesOptions): WorktreeWatches => {
	const watches = new Map<string, Promise<TreeWatcher>>();
	const listeners = new Set<(worktree: string) => void>();

	const start = async (worktree: string) => {
		const root = pathOf(worktree);
		return watchTree({
			root,
			gitDir: await git.gitDir(root),
			ignored: async () =>
				(await git.ignored(root)).filter((path) => path.endsWith("/")),
			onChange: () => {
				for (const listener of listeners) listener(worktree);
			},
			onError: (error) =>
				log.warn("watching a worktree failed", {
					worktree,
					...errorData(error),
				}),
		});
	};

	const unwatch = (worktree: string) => {
		const watch = watches.get(worktree);
		watches.delete(worktree);
		// A watch that failed to start was reported to whoever asked for it.
		watch?.then(
			(watcher) => watcher.close(),
			() => undefined,
		);
	};

	return {
		async watch(worktree) {
			let watch = watches.get(worktree);
			if (watch === undefined) {
				const started = start(worktree);
				watches.set(worktree, started);
				// The next call tries again.
				started.catch(() => {
					if (watches.get(worktree) === started) watches.delete(worktree);
				});
				watch = started;
			}
			await watch;
		},
		unwatch,
		keep(worktrees) {
			for (const worktree of watches.keys()) {
				if (!worktrees.has(worktree)) unwatch(worktree);
			}
		},
		onChange(listener) {
			listeners.add(listener);
		},
	};
};
