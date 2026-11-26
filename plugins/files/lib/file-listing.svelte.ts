import type { DirEntry } from "@yaa/contracts/worktree-files";
import type { PanelContext } from "@yaa/plugin-api/ui";
import { filesProtocol } from "../protocol.ts";
import { buildTree, type Listing } from "./file-tree.ts";

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// A worktree's files as the backend last listed them, kept up to date.
export const createFileListing = ({ worktree, backend }: PanelContext) => {
	const server = backend(filesProtocol);
	const target = { worktree: worktree.id };

	let listing = $state.raw<Listing>();
	// The entries of the lazy folders opened so far.
	let loaded = $state.raw<ReadonlyMap<string, readonly DirEntry[]>>(new Map());
	let showIgnored = $state(false);
	// Why the list may be wrong or out of date.
	let problem = $state<string>();
	const tree = $derived(listing && buildTree(listing, loaded));

	const readDir = async (path: string) =>
		(await server.request("readDir", { ...target, path })).entries;

	const read = async () => {
		const next = await server.request("list", {
			...target,
			ignored: showIgnored,
		});
		// A folder that is gone since it was opened drops out.
		const opened = new Set(loaded.keys());
		const folders = await Promise.all(
			[...opened].map((path) =>
				readDir(path).then(
					(entries) => [[path, entries] as const],
					() => [],
				),
			),
		);
		listing = next;
		// One opened while this was reading keeps what it read.
		loaded = new Map([
			...[...loaded].filter(([path]) => !opened.has(path)),
			...folders.flat(),
		]);
		problem = next.problem ?? undefined;
	};

	// One read at a time; changes during it lead to one more.
	let reading: Promise<void> | undefined;
	let again = false;
	const refresh = (): Promise<void> => {
		if (reading !== undefined) {
			again = true;
			return reading;
		}
		reading = (async () => {
			try {
				do {
					again = false;
					await read();
				} while (again);
			} catch (error) {
				problem = describe(error);
			} finally {
				reading = undefined;
			}
		})();
		return reading;
	};

	server.subscribe("changed", (changed) => {
		if (changed.worktree === worktree.id) void refresh();
	});
	server.onRestart(() => void refresh());
	void refresh();

	return {
		// Undefined until the first listing arrives.
		get tree() {
			return tree;
		},
		get problem() {
			return problem;
		},
		get showIgnored() {
			return showIgnored;
		},
		toggleIgnored() {
			showIgnored = !showIgnored;
			void refresh();
		},
		refresh,
		// Reads a lazy folder that is being opened.
		async load(path: string) {
			try {
				const entries = await readDir(path);
				loaded = new Map(loaded).set(path, entries);
			} catch (error) {
				problem = describe(error);
			}
		},
		// Each resolves once the list shows the change, or rejects with why it
		// was refused.
		async create(path: string) {
			await server.request("create", { ...target, path });
			await refresh();
		},
		async rename(from: string, to: string) {
			await server.request("rename", { ...target, from, to });
			await refresh();
		},
		async remove(path: string) {
			await server.request("remove", { ...target, path });
			await refresh();
		},
	};
};

export type FileListing = ReturnType<typeof createFileListing>;
