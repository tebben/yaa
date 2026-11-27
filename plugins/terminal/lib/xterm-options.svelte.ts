import type { ITerminalOptions, ITheme } from "@xterm/xterm";
import { fontStack } from "@yaa/ui";
import * as z from "zod";

// xterm's colours by the token each takes: the theme's terminal palette
// (docs/spec/07-editor-files-terminal.md).
const colors = {
	background: "surface",
	foreground: "text",
	cursor: "accent",
	cursorAccent: "surface",
	selectionBackground: "selection",
	scrollbarSliderBackground: "border-strong",
	scrollbarSliderHoverBackground: "border-strong",
	scrollbarSliderActiveBackground: "focus",
	black: "terminal-black",
	red: "terminal-red",
	green: "terminal-green",
	yellow: "terminal-yellow",
	blue: "terminal-blue",
	magenta: "terminal-magenta",
	cyan: "terminal-cyan",
	white: "terminal-white",
	brightBlack: "terminal-bright-black",
	brightRed: "terminal-bright-red",
	brightGreen: "terminal-bright-green",
	brightYellow: "terminal-bright-yellow",
	brightBlue: "terminal-bright-blue",
	brightMagenta: "terminal-bright-magenta",
	brightCyan: "terminal-bright-cyan",
	brightWhite: "terminal-bright-white",
} as const;

// The terminal's settings, as plugin.json declares them; the app sends them
// checked and with their defaults.
export const terminalSettings = z.object({
	"terminal.fontFamily": z.string(),
	"terminal.fontSize": z.number(),
	"terminal.lineHeight": z.number(),
	"terminal.letterSpacing": z.number(),
	"terminal.cursorStyle": z.enum(["block", "bar", "underline"]),
	"terminal.cursorBlink": z.boolean(),
});

export type TerminalSettings = z.infer<typeof terminalSettings>;

// xterm's options from the settings and the app's tokens, read from the
// page, so a theme or setting that changes the CSS variables changes the
// terminal.
export const terminalOptions = (
	element: Element,
	settings: TerminalSettings,
) => {
	const styles = getComputedStyle(element);
	const value = (name: string) => styles.getPropertyValue(name).trim();
	const theme: ITheme = Object.fromEntries(
		Object.entries(colors).map(([key, token]) => [
			key,
			value(`--color-${token}`),
		]),
	);
	return {
		theme,
		fontFamily: fontStack(
			settings["terminal.fontFamily"],
			value("--font-mono"),
		),
		fontSize: settings["terminal.fontSize"],
		lineHeight: settings["terminal.lineHeight"],
		letterSpacing: settings["terminal.letterSpacing"],
		cursorStyle: settings["terminal.cursorStyle"],
		cursorBlink: settings["terminal.cursorBlink"],
	} satisfies ITerminalOptions;
};
