import type { ITerminalOptions, ITheme } from "@xterm/xterm";

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

// The app's tokens as xterm's options, read from the page, so a theme that
// changes the CSS variables changes the terminal.
export const optionsFromTokens = (element: Element) => {
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
		fontFamily: value("--font-mono"),
		fontSize: Number.parseFloat(value("--text-xs")),
	} satisfies ITerminalOptions;
};
