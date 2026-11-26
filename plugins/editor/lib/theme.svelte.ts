import type { editor } from "monaco-editor/editor";
import { hexColor } from "../css-color.ts";

// Monaco's colours by the token each takes.
const colors: Record<string, string> = {
	"editor.background": "surface",
	"editor.foreground": "text",
	"editorLineNumber.foreground": "text-muted",
	"editorLineNumber.activeForeground": "text",
	"editorCursor.foreground": "accent",
	"editor.selectionBackground": "selection",
	"editor.inactiveSelectionBackground": "pressed",
	"editor.lineHighlightBackground": "raised",
	"editorIndentGuide.background1": "border",
	"editorIndentGuide.activeBackground1": "border-strong",
	"editorWhitespace.foreground": "border-strong",
	"editorWidget.background": "overlay",
	"editorWidget.border": "border-strong",
	"editorHoverWidget.background": "overlay",
	"editorHoverWidget.border": "border-strong",
	"editorSuggestWidget.background": "overlay",
	"editorSuggestWidget.border": "border-strong",
	"editorSuggestWidget.selectedBackground": "selection",
	"editorError.foreground": "state-error",
	"editorWarning.foreground": "state-attention",
	"input.background": "raised",
	"input.border": "border-strong",
	"input.foreground": "text",
	"list.hoverBackground": "hover",
	"list.activeSelectionBackground": "selection",
	"quickInput.background": "overlay",
	"menu.background": "overlay",
	"menu.foreground": "text",
	"menu.selectionBackground": "selection",
	focusBorder: "focus",
	"scrollbarSlider.background": "border-strong",
	"scrollbarSlider.hoverBackground": "border-strong",
	"scrollbarSlider.activeBackground": "focus",
	"diffEditor.insertedTextBackground": "diff-added",
	"diffEditor.removedTextBackground": "diff-removed",
};

// The syntax token each of Monaco's token kinds takes; a kind covers the
// longer names under it.
const syntax: Record<string, string> = {
	keyword: "syntax-keyword",
	tag: "syntax-keyword",
	string: "syntax-string",
	"attribute.value": "syntax-string",
	regexp: "syntax-string",
	"string.key.json": "syntax-type",
	"string.value.json": "syntax-string",
	number: "syntax-number",
	"keyword.json": "syntax-number",
	comment: "syntax-comment",
	type: "syntax-type",
	"attribute.name": "syntax-type",
	annotation: "syntax-type",
	delimiter: "text-soft",
};

// The app's tokens as a Monaco theme, read from the page, so a theme that
// changes the CSS variables changes the editor.
export const themeFromTokens = (
	element: Element,
): editor.IStandaloneThemeData => {
	const styles = getComputedStyle(element);
	const token = (name: string) =>
		hexColor(styles.getPropertyValue(`--color-${name}`));
	return {
		base: "vs-dark",
		inherit: true,
		rules: Object.entries(syntax).map(([kind, name]) => ({
			token: kind,
			foreground: token(name).slice(1),
		})),
		colors: Object.fromEntries(
			Object.entries(colors).map(([key, name]) => [key, token(name)]),
		),
	};
};
