import { fuzzyMatch } from "@yaa/commands/fuzzy-match";
import type {
	DirEntry,
	GitChange,
	GitFiles,
} from "@yaa/contracts/worktree-files";

// The tree the panel shows, from what the backend lists.

export type Listing = GitFiles & {
	// Ignored files and folders, a folder ending with `/`; empty while they
	// are hidden.
	ignored: readonly string[];
	changes: readonly GitChange[];
};

export type FileStatus =
	| "modified"
	| "added"
	| "renamed"
	| "untracked"
	| "conflicted";

export type FileNode = {
	path: string;
	name: string;
	folder: boolean;
	ignored: boolean;
	// A folder git does not list the files of: its entries are read when it
	// is expanded.
	lazy: boolean;
	status: FileStatus | undefined;
	// A folder with a changed file somewhere in it, a deleted one included.
	changed: boolean;
};

// Each folder's entries by its path, "" being the top; folders first, then
// by name.
export type FileTree = ReadonlyMap<string, readonly FileNode[]>;

// A node as the list shows it: how deep it sits, and whether it is open.
export type Row = FileNode & {
	label: string;
	depth: number;
	expanded: boolean;
};

export const parentOf = (path: string): string =>
	path.slice(0, Math.max(path.lastIndexOf("/"), 0));

// The folders a path is in, the outermost first.
export const ancestors = (path: string): string[] => {
	const parent = parentOf(path);
	return parent === "" ? [] : [...ancestors(parent), parent];
};

const statusOf = ({ staged, unstaged }: GitChange): FileStatus | undefined => {
	if (unstaged === "unmerged") return "conflicted";
	if (unstaged === "untracked") return "untracked";
	if (staged === "added" || staged === "copied") return "added";
	if (staged === "renamed" || unstaged === "renamed") return "renamed";
	if (staged === "deleted" || unstaged === "deleted") return undefined;
	return "modified";
};

const statuses = (changes: readonly GitChange[]) => {
	const found = new Map<string, FileStatus>();
	// Files the index still lists and the folder no longer holds.
	const deleted = new Set<string>();
	const changed = new Set<string>();
	for (const change of changes) {
		for (const folder of ancestors(change.path)) changed.add(folder);
		if (change.unstaged === "deleted") deleted.add(change.path);
		else {
			// A file taken out of the index and kept is listed twice; being
			// untracked says more.
			const status = statusOf(change);
			if (status !== undefined) found.set(change.path, status);
		}
	}
	return { found, deleted, changed };
};

const byKindThenName = (a: FileNode, b: FileNode) =>
	Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name);

// `loaded` holds the entries read for the lazy folders opened so far.
export const buildTree = (
	{ files, folders, ignored, changes }: Listing,
	loaded: ReadonlyMap<string, readonly DirEntry[]>,
): FileTree => {
	const { found, deleted, changed } = statuses(changes);
	const nodes = new Map<string, FileNode>();
	const add = (
		path: string,
		kind: { folder: boolean; ignored: boolean; lazy: boolean },
	) => {
		for (const folder of ancestors(path)) {
			if (!nodes.has(folder)) {
				add(folder, { folder: true, ignored: false, lazy: false });
			}
		}
		if (nodes.has(path)) return;
		nodes.set(path, {
			...kind,
			path,
			name: path.slice(path.lastIndexOf("/") + 1),
			status: found.get(path),
			changed: changed.has(path),
		});
	};

	for (const path of files) {
		if (!deleted.has(path)) {
			add(path, { folder: false, ignored: false, lazy: false });
		}
	}
	for (const path of folders) {
		add(path, { folder: true, ignored: false, lazy: true });
	}
	for (const entry of ignored) {
		const folder = entry.endsWith("/");
		add(folder ? entry.slice(0, -1) : entry, {
			folder,
			ignored: true,
			lazy: folder,
		});
	}
	// Parents come before the folders read inside them, as paths sort.
	for (const [parent, entries] of [...loaded].sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		const within = nodes.get(parent);
		if (within?.lazy !== true) continue;
		for (const { name, folder } of entries) {
			add(`${parent}/${name}`, {
				folder,
				ignored: within.ignored,
				lazy: folder,
			});
		}
	}

	const tree = new Map<string, FileNode[]>();
	for (const node of nodes.values()) {
		const parent = parentOf(node.path);
		const siblings = tree.get(parent);
		if (siblings === undefined) tree.set(parent, [node]);
		else siblings.push(node);
	}
	for (const siblings of tree.values()) siblings.sort(byKindThenName);
	return tree;
};

// The rows on screen: the top entries, and those of every expanded folder.
export const visibleRows = (
	tree: FileTree,
	expanded: ReadonlySet<string>,
	folder = "",
	depth = 0,
): Row[] =>
	(tree.get(folder) ?? []).flatMap((node) => {
		const open = node.folder && expanded.has(node.path);
		const row = { ...node, label: node.name, depth, expanded: open };
		return open
			? [row, ...visibleRows(tree, expanded, node.path, depth + 1)]
			: [row];
	});

// The files whose path matches the query, best first, as a flat list; at most
// `limit` of them. Ignored folders that have not been opened hold none.
export const filterFiles = (
	tree: FileTree,
	query: string,
	limit: number,
): Row[] =>
	fuzzyMatch(
		query,
		[...tree.values()].flat().filter((node) => !node.folder),
		(node) => node.path,
	)
		.slice(0, limit)
		.map((node) => ({ ...node, label: node.path, depth: 0, expanded: false }));
