import { fontStack } from "@yaa/ui";
import { editor } from "monaco-editor/editor";
import type { VimAdapterInstance } from "monaco-vim";
import { untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import { type EditorSettings, editorOptions } from "./editor-options.ts";
import { applyTheme, remeasureFonts } from "./monaco.svelte.ts";
import { attachVim } from "./vim.svelte.ts";

export const createDiffView = (
	save: () => void,
	captureKeys: Attachment<HTMLElement>,
) => {
	let view: editor.IStandaloneDiffEditor | undefined;
	let settings: EditorSettings | undefined;
	let status: HTMLElement | undefined;
	let vim: VimAdapterInstance | undefined;
	let wanted:
		| {
				original: editor.ITextModel;
				modified: editor.ITextModel;
				readOnly: boolean;
		  }
		| undefined;
	const useVim = () => {
		if (view === undefined || status === undefined) return;
		const enabled =
			settings?.["editor.vim"] === true && wanted?.readOnly === false;
		status.hidden = !enabled;
		if (enabled) vim ??= attachVim(view.getModifiedEditor(), status, save);
		else {
			vim?.dispose();
			vim = undefined;
		}
	};
	const configure = (element: HTMLElement, next: EditorSettings) => {
		const font = fontStack(
			next["editor.fontFamily"],
			getComputedStyle(element).getPropertyValue("--font-mono").trim(),
		);
		applyTheme(element);
		view?.updateOptions({
			...editorOptions(next, font),
			readOnly: wanted?.readOnly ?? true,
		});
		useVim();
		remeasureFonts();
	};
	return {
		attach: ((element: HTMLElement) =>
			untrack(() => {
				if (settings === undefined)
					throw new Error("The editor renders before its settings");
				const text = document.createElement("div");
				text.className = "text";
				status = document.createElement("div");
				status.className = "vim";
				const released = captureKeys(status);
				element.replaceChildren(text, status);
				view = editor.createDiffEditor(text, {
					automaticLayout: true,
					readOnly: true,
				});
				configure(element, settings);
				if (wanted !== undefined) {
					view.setModel(wanted);
					view.updateOptions({ readOnly: wanted.readOnly });
				}
				return () => {
					vim?.dispose();
					vim = undefined;
					view?.dispose();
					view = undefined;
					status = undefined;
					if (typeof released === "function") released();
				};
			})) satisfies Attachment<HTMLElement>,
		configure(next: EditorSettings) {
			settings = next;
			const element = view?.getContainerDomNode();
			if (element !== undefined) configure(element, next);
		},
		display(models: typeof wanted) {
			wanted = models;
			if (view === undefined) return;
			view.setModel(models ?? null);
			view.updateOptions({ readOnly: models?.readOnly ?? true });
			useVim();
		},
		focus() {
			view?.getModifiedEditor().focus();
		},
	};
};
