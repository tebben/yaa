import type { editor } from "monaco-editor/editor";
import type { Attachment } from "svelte/attachments";
import { createEditor } from "./monaco.svelte.ts";
import { attachVim } from "./vim.svelte.ts";

type GoTo = { line?: number | undefined; focus?: boolean | undefined };

// The panel's one Monaco editor, showing one file's model at a time and
// coming back to each where it was left, with vim keys whose `:w` calls `save`.
export const createEditorView = (save: () => void) => {
	let view = $state.raw<editor.IStandaloneCodeEditor>();
	const places = new Map<string, editor.ICodeEditorViewState | null>();
	let shown: string | undefined;
	// Where to go in a file once it shows.
	let wanted:
		| { path: string; line: number | undefined; focus: boolean }
		| undefined;

	const arrive = () => {
		if (view === undefined || wanted === undefined || wanted.path !== shown) {
			return;
		}
		const { line, focus } = wanted;
		wanted = undefined;
		if (line !== undefined) {
			view.setPosition({ lineNumber: line, column: 1 });
			view.revealLineInCenter(line);
		}
		if (focus) view.focus();
	};

	return {
		attach: ((element) => {
			// Monaco and the vim status line each fill an element of their own.
			const text = document.createElement("div");
			text.className = "text";
			const status = document.createElement("div");
			status.className = "vim";
			element.replaceChildren(text, status);
			const created = createEditor(text);
			const vim = attachVim(created, status, save);
			view = created;
			return () => {
				view = undefined;
				shown = undefined;
				vim.dispose();
				created.dispose();
			};
		}) satisfies Attachment<HTMLElement>,
		// Shows the file's model, or nothing.
		display(path: string | undefined, model: editor.ITextModel | undefined) {
			if (view === undefined) return;
			if (model === undefined) {
				if (shown !== undefined) places.set(shown, view.saveViewState());
				view.setModel(null);
				shown = undefined;
				return;
			}
			if (view.getModel() !== model) {
				if (shown !== undefined && shown !== path) {
					places.set(shown, view.saveViewState());
				}
				view.setModel(model);
				shown = path;
				if (path !== undefined) {
					view.restoreViewState(places.get(path) ?? null);
				}
			}
			arrive();
		},
		// Goes to the file, at the line if one is given, and focuses the editor
		// unless told not to; now or once the file shows.
		goTo(path: string, { line, focus = true }: GoTo = {}) {
			wanted = { path, line, focus };
			arrive();
		},
		focus() {
			view?.focus();
		},
	};
};

export type EditorView = ReturnType<typeof createEditorView>;
