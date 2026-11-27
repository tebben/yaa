// Monaco with highlighting for its languages and no language services but
// JSON's, which highlights it (docs/decisions/0030-editor-monaco.md).
import "monaco-editor/features/register.all";
import "monaco-editor/languages/definitions/register.all";
import "monaco-editor/languages/features/json/register";
import { editor, Uri } from "monaco-editor/editor";
import startEditorWorker from "monaco-editor/editor/editor.worker?worker";
import startJsonWorker from "monaco-editor/languages/features/json/json.worker?worker";
import { themeFromTokens } from "./theme.svelte.ts";

self.MonacoEnvironment = {
	getWorker: (_id, label) =>
		label === "json" ? startJsonWorker() : startEditorWorker(),
};

const THEME = "yaa";
let models = 0;

// A model for a file's text; its language follows from the path. Each has an
// address of its own, as two panels may hold one file for a moment.
export const createModel = (
	worktree: string,
	path: string,
	text: string,
): editor.ITextModel => {
	models += 1;
	return editor.createModel(
		text,
		undefined,
		Uri.from({
			scheme: "yaa",
			authority: worktree,
			path: `/${path}`,
			query: String(models),
		}),
	);
};

// Takes the app's tokens again, after a theme or a setting changed them.
// Monaco has one theme for every editor on the page.
export const applyTheme = (element: Element) => {
	editor.defineTheme(THEME, themeFromTokens(element));
	editor.setTheme(THEME);
};

// Measured before the font arrived, every column would be off.
export const remeasureFonts = () =>
	void document.fonts.ready.then(() => editor.remeasureFonts());

// The width of the app's thin scrollbar (packages/ui/styles.css), measured,
// since CSS names it only as thin.
const scrollbarWidth = (within: HTMLElement) => {
	const probe = document.createElement("div");
	probe.style.cssText = "position: absolute; overflow: scroll; width: 50px";
	within.append(probe);
	const width = probe.offsetWidth - probe.clientWidth;
	probe.remove();
	return width;
};

export const createEditor = (
	element: HTMLElement,
	options: editor.IEditorOptions & editor.IGlobalEditorOptions,
): editor.IStandaloneCodeEditor => {
	const scrollbar = scrollbarWidth(element);
	applyTheme(element);
	const created = editor.create(element, {
		...options,
		model: null,
		theme: THEME,
		automaticLayout: true,
		// The app's thin scrollbar, not Monaco's wide one.
		scrollbar: {
			verticalScrollbarSize: scrollbar,
			horizontalScrollbarSize: scrollbar,
			useShadows: false,
		},
		// Menus and hovers would otherwise be cut off at the panel's edge.
		fixedOverflowWidgets: true,
	});
	remeasureFonts();
	return created;
};
