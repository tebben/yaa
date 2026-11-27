import type { editor } from "monaco-editor/editor";
import * as z from "zod";

// The editor's settings, as plugin.json declares them; the app sends them
// checked and with their defaults.
export const editorSettings = z.object({
	"editor.fontFamily": z.string(),
	"editor.fontSize": z.number(),
	"editor.lineHeight": z.number(),
	"editor.fontLigatures": z.boolean(),
	"editor.wordWrap": z.enum(["off", "on", "wordWrapColumn"]),
	"editor.wordWrapColumn": z.number(),
	"editor.lineNumbers": z.enum(["on", "relative", "off"]),
	"editor.renderWhitespace": z.enum([
		"none",
		"selection",
		"boundary",
		"trailing",
		"all",
	]),
	"editor.renderLineHighlight": z.enum(["none", "gutter", "line", "all"]),
	"editor.minimap": z.boolean(),
	"editor.stickyScroll": z.boolean(),
	"editor.indentGuides": z.boolean(),
	"editor.bracketPairColorization": z.boolean(),
	"editor.scrollBeyondLastLine": z.boolean(),
	"editor.detectIndentation": z.boolean(),
	"editor.tabSize": z.number(),
	"editor.insertSpaces": z.boolean(),
	"editor.cursorStyle": z.enum(["line", "block", "underline"]),
	"editor.cursorBlinking": z.enum([
		"blink",
		"smooth",
		"phase",
		"expand",
		"solid",
	]),
	"editor.smoothCaret": z.boolean(),
	"editor.smoothScrolling": z.boolean(),
	"editor.vim": z.boolean(),
});

export type EditorSettings = z.infer<typeof editorSettings>;

// Monaco's options from the settings. `fontFamily` is the font stack to use,
// the settings' font before the app's code font.
export const editorOptions = (
	settings: EditorSettings,
	fontFamily: string,
): editor.IEditorOptions & editor.IGlobalEditorOptions => ({
	fontFamily,
	fontSize: settings["editor.fontSize"],
	// Monaco takes a line height under 8 as a multiple of the font size.
	lineHeight: settings["editor.lineHeight"],
	fontLigatures: settings["editor.fontLigatures"],
	wordWrap: settings["editor.wordWrap"],
	wordWrapColumn: settings["editor.wordWrapColumn"],
	lineNumbers: settings["editor.lineNumbers"],
	renderWhitespace: settings["editor.renderWhitespace"],
	renderLineHighlight: settings["editor.renderLineHighlight"],
	minimap: { enabled: settings["editor.minimap"] },
	stickyScroll: { enabled: settings["editor.stickyScroll"] },
	guides: { indentation: settings["editor.indentGuides"] },
	bracketPairColorization: {
		enabled: settings["editor.bracketPairColorization"],
	},
	scrollBeyondLastLine: settings["editor.scrollBeyondLastLine"],
	detectIndentation: settings["editor.detectIndentation"],
	tabSize: settings["editor.tabSize"],
	insertSpaces: settings["editor.insertSpaces"],
	cursorStyle: settings["editor.cursorStyle"],
	cursorBlinking: settings["editor.cursorBlinking"],
	cursorSmoothCaretAnimation: settings["editor.smoothCaret"] ? "on" : "off",
	smoothScrolling: settings["editor.smoothScrolling"],
});
