import { fontStack } from "@yaa/ui";
import type { editor } from "monaco-editor/editor";
import type { VimAdapterInstance } from "monaco-vim";
import { untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import { type EditorSettings, editorOptions } from "./editor-options.ts";
import { applyTheme, createEditor, remeasureFonts } from "./monaco.svelte.ts";
import { attachVim } from "./vim.svelte.ts";

type GoTo = { line?: number | undefined; focus?: boolean | undefined };

// The panel's one Monaco editor, showing one file's model at a time and
// coming back to each where it was left, set up by the editor's settings,
// with vim keys whose `:w` calls `save` while they are on. `captureKeys`
// gives the vim status line the keys typed after / and :.
export const createEditorView = (
	save: () => void,
	captureKeys: Attachment<HTMLElement>,
) => {
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

	// The latest settings, which come before the panel renders.
	let settings: EditorSettings | undefined;
	// The vim status line, and vim keys while the settings have them on.
	let status: HTMLElement | undefined;
	let vim: VimAdapterInstance | undefined;

	const options = (element: Element, next: EditorSettings) =>
		editorOptions(
			next,
			fontStack(
				next["editor.fontFamily"],
				getComputedStyle(element).getPropertyValue("--font-mono").trim(),
			),
		);
	const useVim = (on: boolean) => {
		if (view === undefined || status === undefined) return;
		status.hidden = !on;
		if (on) vim ??= attachVim(view, status, save);
		else {
			vim?.dispose();
			vim = undefined;
		}
	};

	return {
		// Untracked, so setting `view` does not run it again; changed settings
		// go to `configure`.
		attach: ((element) =>
			untrack(() => {
				if (settings === undefined) {
					throw new Error("The editor renders before its settings");
				}
				// Monaco and the vim status line each fill an element of their own.
				const text = document.createElement("div");
				text.className = "text";
				status = document.createElement("div");
				status.className = "vim";
				// What is typed after / and : is vim's, Escape included.
				const released = captureKeys(status);
				element.replaceChildren(text, status);
				const created = createEditor(text, options(element, settings));
				view = created;
				useVim(settings["editor.vim"]);
				return () => {
					useVim(false);
					view = undefined;
					status = undefined;
					shown = undefined;
					created.dispose();
					if (typeof released === "function") released();
				};
			})) satisfies Attachment<HTMLElement>,
		// Takes changed settings, and the app's tokens again, which the
		// appearance settings may have changed.
		configure(next: EditorSettings) {
			settings = next;
			const element = view?.getContainerDomNode();
			if (view === undefined || element === undefined) return;
			applyTheme(element);
			view.updateOptions(options(element, next));
			remeasureFonts();
			useVim(next["editor.vim"]);
		},
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
