import type { FileListing } from "./file-listing.svelte.ts";
import { parentOf, type Row } from "./file-tree.ts";

// What the panel is asking the user before it changes a file: the new path of
// one being made or renamed, or a yes to deleting one.
export type Edit =
	| { kind: "create" }
	| { kind: "rename"; from: string }
	| { kind: "delete"; path: string; folder: boolean };

type FileEditsOptions = {
	files: Pick<FileListing, "create" | "rename" | "remove">;
	// The row keys act on.
	selected(): Row | undefined;
	// Shows a path that now exists.
	reveal(path: string): Promise<void>;
	// Gives focus back to the list, on the row of `path` when it has one, or
	// else on the row that had it.
	leave(path?: string): void;
};

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

export const createFileEdits = ({
	files,
	selected,
	reveal,
	leave,
}: FileEditsOptions) => {
	let edit = $state.raw<Edit>();
	// The path being typed.
	let path = $state("");
	// Why the last change was refused.
	let refused = $state<string>();

	const start = (next: Edit, text = "") => {
		edit = next;
		path = text;
		refused = undefined;
	};

	// A refused change stays open, with the reason, to be corrected.
	const apply = async (change: () => Promise<void>) => {
		refused = undefined;
		try {
			await change();
			return true;
		} catch (error) {
			refused = describe(error);
			return false;
		}
	};

	return {
		get edit() {
			return edit;
		},
		get path() {
			return path;
		},
		set path(text: string) {
			path = text;
		},
		get refused() {
			return refused;
		},
		// A new file starts in the selected folder, or beside the selected file.
		create() {
			const row = selected();
			const folder = row?.folder ? row.path : parentOf(row?.path ?? "");
			start({ kind: "create" }, folder === "" ? "" : `${folder}/`);
		},
		rename() {
			const row = selected();
			if (row !== undefined) {
				start({ kind: "rename", from: row.path }, row.path);
			}
		},
		remove() {
			const row = selected();
			if (row !== undefined) {
				start({ kind: "delete", path: row.path, folder: row.folder });
			}
		},
		// Does what is being asked about.
		async confirm() {
			const asked = edit;
			if (asked === undefined) return;
			if (asked.kind === "delete") {
				if (await apply(() => files.remove(asked.path))) {
					edit = undefined;
					leave(parentOf(asked.path));
				}
				return;
			}
			const target = path.trim();
			if (asked.kind === "rename" && target === asked.from) {
				edit = undefined;
				leave();
				return;
			}
			const done = await apply(() =>
				asked.kind === "create"
					? files.create(target)
					: files.rename(asked.from, target),
			);
			if (done) {
				edit = undefined;
				await reveal(target);
			}
		},
		// False when nothing was being asked.
		cancel(): boolean {
			if (edit === undefined) return false;
			edit = undefined;
			refused = undefined;
			leave();
			return true;
		},
	};
};

export type FileEdits = ReturnType<typeof createFileEdits>;
