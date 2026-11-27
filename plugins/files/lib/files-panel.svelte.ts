import type { PanelContext } from "@yaa/plugin-api/ui";
import { arrive, editField } from "@yaa/ui/focus";
import { tick } from "svelte";
import type { Attachment } from "svelte/attachments";
import { createFileEdits } from "./file-edits.svelte.ts";
import { createFileListing } from "./file-listing.svelte.ts";
import { ancestors, filterFiles, parentOf, visibleRows } from "./file-tree.ts";

// How many matches the filter shows.
const FILTER_LIMIT = 100;

// The files panel: the rows on screen, which of them keys act on, and the
// panel's commands.
export const createFilesPanel = (panel: PanelContext) => {
	const files = createFileListing(panel);
	let expanded = $state.raw<ReadonlySet<string>>(new Set());
	let query = $state("");
	// The row that had focus last.
	let current = $state<string>();

	const filtering = $derived(query.trim() !== "");
	const rows = $derived.by(() => {
		const { tree } = files;
		if (tree === undefined) return [];
		return filtering
			? filterFiles(tree, query, FILTER_LIMIT)
			: visibleRows(tree, expanded);
	});
	const selected = $derived(rows.find((row) => row.path === current));

	// The rows' list and the filter field, to move focus between them.
	let list: HTMLElement | undefined;
	let field: HTMLInputElement | undefined;

	const buttons = () => [...(list?.querySelectorAll("button") ?? [])];
	const focusRow = (index: number) =>
		buttons()[index]?.focus({ focusVisible: true });
	// The row of `path`, or else the first one, or the filter field.
	const focusPath = async (path: string | undefined) => {
		await tick();
		const index = rows.findIndex((row) => row.path === path);
		if (rows.length > 0) focusRow(Math.max(index, 0));
		else if (field !== undefined) arrive(field, { focusVisible: true });
	};
	// The index of the row focus is on; -1 when it is on none.
	const focused = () =>
		buttons().findIndex((button) => button === document.activeElement);

	const setExpanded = (path: string, open: boolean) => {
		const lazy = rows.some((row) => row.path === path && row.lazy);
		const next = new Set(expanded);
		if (open) next.add(path);
		else next.delete(path);
		expanded = next;
		if (open && lazy) void files.load(path);
	};

	// Shows the row of a path that was just made or moved.
	const reveal = async (path: string) => {
		query = "";
		expanded = new Set([...expanded, ...ancestors(path)]);
		current = path;
		await focusPath(path);
	};

	const edits = createFileEdits({
		files,
		selected: () => selected,
		reveal,
		leave: (path) => void focusPath(path ?? current),
	});

	const commands: Record<string, () => void> = {
		"files.next": () => {
			const next = focused() + 1;
			focusRow(Math.min(next, rows.length - 1));
		},
		// Above the first row is the filter field.
		"files.previous": () => {
			const at = focused();
			if (at > 0) focusRow(at - 1);
			else if (field !== undefined) arrive(field, { focusVisible: true });
		},
		// Opens a folder, then steps into it.
		"files.expand": () => {
			const row = rows[focused()];
			if (row?.folder !== true || filtering) return;
			if (!row.expanded) setExpanded(row.path, true);
			else if ((rows[focused() + 1]?.depth ?? 0) > row.depth) {
				focusRow(focused() + 1);
			}
		},
		// Closes a folder, or steps out to the one holding the row.
		"files.collapse": () => {
			const row = rows[focused()];
			if (row === undefined || filtering) return;
			if (row.expanded) setExpanded(row.path, false);
			else void focusPath(parentOf(row.path) || row.path);
		},
		"files.filter": () => {
			if (field === undefined) return;
			editField(field, { focusVisible: true });
			field.select();
		},
		"files.new": edits.create,
		"files.rename": edits.rename,
		"files.delete": edits.remove,
		"files.toggleIgnored": files.toggleIgnored,
		// Backs out of whatever is open: an edit, then the filter.
		"files.cancel": () => {
			if (edits.cancel()) return;
			if (query !== "") {
				query = "";
				void focusPath(current);
			}
		},
	};
	for (const [command, run] of Object.entries(commands)) {
		panel.commands.register(command, run);
	}

	return {
		files,
		edits,
		get rows() {
			return rows;
		},
		get filtering() {
			return filtering;
		},
		// More files match than are shown.
		get truncated() {
			return filtering && rows.length === FILTER_LIMIT;
		},
		get current() {
			return current;
		},
		get query() {
			return query;
		},
		set query(text: string) {
			query = text;
		},
		list: ((element: HTMLElement) => {
			list = element;
			return () => {
				list = undefined;
			};
		}) satisfies Attachment<HTMLElement>,
		field: ((element: HTMLInputElement) => {
			field = element;
			return () => {
				field = undefined;
			};
		}) satisfies Attachment<HTMLInputElement>,
		focused(path: string) {
			current = path;
		},
		// A click, or Enter, on a row: a folder opens or closes, a file opens in
		// the editor. A click previews it and stays here; Enter and a double
		// click move to the editor, and a double click keeps its tab.
		activate(path: string, by: "mouse" | "keys" | "double") {
			current = path;
			const row = rows.find((candidate) => candidate.path === path);
			if (row === undefined) return;
			if (!row.folder) {
				const keep = by === "double";
				panel.openFile({ path, keep, focus: by !== "mouse" });
			} else if (by !== "double") setExpanded(path, !row.expanded);
		},
		// Enter in the filter field moves to the first match.
		focusFirst() {
			focusRow(0);
		},
	};
};

export type FilesPanelController = ReturnType<typeof createFilesPanel>;
