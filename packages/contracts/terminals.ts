import * as z from "zod";

// A terminal of a worktree (docs/spec/07-editor-files-terminal.md). Core
// keeps it until it is closed or its shell exits.
export const terminal = z.object({
	id: z.string(),
	worktree: z.string(),
	// The program in the foreground, such as `zsh` or `vim`.
	title: z.string(),
	cwd: z.string(),
});

export const terminalSize = z.object({
	cols: z.number().int().min(1).max(1000),
	rows: z.number().int().min(1).max(1000),
});

// Output counts in characters from the terminal's start. `offset` is how many
// there are up to and including the chunk or snapshot it comes with.
const offset = z.number().int().min(0);

// What a view starts from: the screen and scrollback as escape sequences.
export const terminalSnapshot = z.object({ data: z.string(), offset });

export const terminalOutput = z.object({
	id: z.string(),
	data: z.string(),
	offset,
});

// One view of a terminal, such as a panel: core pauses the terminal's program
// while a view is far behind in showing its output.
export const terminalView = z.object({ id: z.string(), view: z.string() });

export const terminalProgress = terminalView.extend({ offset });

export type Terminal = z.infer<typeof terminal>;
export type TerminalSize = z.infer<typeof terminalSize>;
export type TerminalSnapshot = z.infer<typeof terminalSnapshot>;
export type TerminalOutput = z.infer<typeof terminalOutput>;

// How many lines of scrollback the mirror and a view keep, and the character
// widths both use: they must agree on what is on the screen.
export const TERMINAL_SCROLLBACK = 5000;
export const TERMINAL_UNICODE = "11";

// A view says how far it is after at least this many characters, and core
// resumes a paused program once no view is further behind than this.
export const TERMINAL_ACK_CHARS = 32_768;
