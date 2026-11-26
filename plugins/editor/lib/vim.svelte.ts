// Vim keys in the editor, from monaco-vim. Its status line shows the mode and
// takes what is typed after / and :.
import type { editor } from "monaco-editor/editor";
import { initVimMode, type VimAdapterInstance, VimMode } from "monaco-vim";

// monaco-vim has one `:w` for every editor, so each editor's save is kept here.
const saves = new WeakMap<editor.ICodeEditor, () => void>();
Object.assign(VimMode.commands, {
	save: (vim: { editor: editor.ICodeEditor }) => saves.get(vim.editor)?.(),
});

export const attachVim = (
	target: editor.IStandaloneCodeEditor,
	status: HTMLElement,
	save: () => void,
): VimAdapterInstance => {
	saves.set(target, save);
	return initVimMode(target, status);
};
