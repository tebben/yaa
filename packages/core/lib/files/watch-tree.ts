import { type FSWatcher, watch } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export type TreeWatcher = { close(): void };

export type TreeWatcherOptions = {
	root: string;
	// The folder of the checkout's index and HEAD.
	gitDir: string;
	// The ignored folders, relative to the root, each ending with `/`.
	ignored(): Promise<readonly string[]>;
	// Files or git's view of them changed since the last call.
	onChange(): void;
	onError(error: unknown): void;
};

// Changes that arrive this close together are reported once.
const SETTLE_MS = 100;

// The files in the git folder whose change alters what git says of a file.
const GIT_FILES: ReadonlySet<string> = new Set(["index", "HEAD"]);

// A folder that is gone, or that belongs to someone else, such as a volume
// a container writes: there is nothing to watch in it.
const SKIPPED: ReadonlySet<unknown> = new Set([
	"ENOENT",
	"ENOTDIR",
	"EACCES",
	"EPERM",
]);

const isSkipped = (error: unknown) =>
	error instanceof Error && "code" in error && SKIPPED.has(error.code);

// Watches every folder of a worktree that git does not ignore, one watch per
// folder, so build output and dependencies cost nothing
// (docs/decisions/0029-worktree-plugin-api.md). Folders are relative to the
// root with `/`, "" being the root itself.
export const watchTree = async ({
	root,
	gitDir,
	ignored,
	onChange,
	onError,
}: TreeWatcherOptions): Promise<TreeWatcher> => {
	const watchers = new Map<string, FSWatcher>();
	// Folders whose entries changed since the last report.
	let dirty = new Set<string>();
	// An ignore rule changed, so which folders count may have.
	let rescan = false;
	let timer: NodeJS.Timeout | undefined;
	let closed = false;
	// Reports run one at a time.
	let last = Promise.resolve();

	const drop = (folder: string) => {
		for (const [path, watcher] of watchers) {
			if (folder === "" || path === folder || path.startsWith(`${folder}/`)) {
				watcher.close();
				watchers.delete(path);
			}
		}
	};

	// `folder` is undefined for a change in the git folder.
	const changed = (folder: string | undefined, name: string | null) => {
		if (folder !== undefined) {
			dirty.add(folder);
			if (name === ".gitignore") rescan = true;
		}
		timer ??= setTimeout(() => {
			timer = undefined;
			last = last.then(report).catch(onError);
		}, SETTLE_MS);
	};

	// Watches `folder` and the folders in it that are not watched yet, or all
	// of them again when `deep`, and drops the ones that are gone or ignored.
	const scan = async (
		folder: string,
		skip: ReadonlySet<string>,
		deep: boolean,
	): Promise<void> => {
		if (closed) return;
		const path = join(root, folder);
		try {
			// Watched before it is read, so nothing slips in between.
			if (!watchers.has(folder)) {
				const watcher = watch(path, (_event, name) => changed(folder, name));
				// A watched folder that is removed can error; its parent reports it.
				watcher.on("error", () => drop(folder));
				watchers.set(folder, watcher);
			}
			const entries = await readdir(path, { withFileTypes: true });
			const prefix = folder === "" ? "" : `${folder}/`;
			const folders = new Set(
				entries
					.filter((entry) => entry.isDirectory() && entry.name !== ".git")
					.map(({ name }) => `${prefix}${name}`)
					.filter((child) => !skip.has(`${child}/`)),
			);
			for (const watched of watchers.keys()) {
				const isChild =
					watched !== folder &&
					watched.startsWith(prefix) &&
					!watched.slice(prefix.length).includes("/");
				if (isChild && !folders.has(watched)) drop(watched);
			}
			for (const child of folders) {
				if (deep || !watchers.has(child)) await scan(child, skip, deep);
			}
		} catch (error) {
			if (!isSkipped(error)) throw error;
			drop(folder);
		}
	};

	const report = async () => {
		const deep = rescan;
		const folders = deep ? [""] : [...dirty];
		dirty = new Set();
		rescan = false;
		if (folders.length > 0) {
			const skip = new Set(await ignored());
			for (const folder of folders) {
				// A folder dropped meanwhile is its parent's to look at.
				if (watchers.has(folder)) await scan(folder, skip, deep);
			}
		}
		if (!closed) onChange();
	};

	const git = watch(gitDir, (_event, name) => {
		if (name === null || GIT_FILES.has(name)) changed(undefined, name);
	});
	git.on("error", onError);
	const close = () => {
		closed = true;
		clearTimeout(timer);
		drop("");
		git.close();
	};
	try {
		await scan("", new Set(await ignored()), false);
	} catch (error) {
		close();
		throw error;
	}
	return { close };
};
