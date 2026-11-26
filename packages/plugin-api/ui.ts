// What a plugin's UI module exports (docs/spec/03-plugins.md). Components
// run on the app's Svelte runtime and use @yaa/ui; build them with the yaa
// plugin build (docs/decisions/0015-plugin-ui-loading.md).
import type { Client } from "@yaa/contracts/client";
import type { Worktree } from "@yaa/contracts/projects";
import type { Disposable, ProtocolDefinition } from "@yaa/contracts/protocol";
import type { Terminal, TerminalSize } from "@yaa/contracts/terminals";
import type { Component } from "svelte";
import type { Attachment } from "svelte/attachments";

// The plugin's backend, as one of its panels calls it.
export type PluginBackendClient<P extends ProtocolDefinition> = Pick<
	Client<P>,
	"request" | "subscribe"
> & {
	// The backend started over, so it has forgotten what it held.
	onRestart(listener: () => void): Disposable;
};

// A file to show in the worktree's editor.
export type OpenFile = {
	// Relative to the worktree's folder, with `/`.
	path: string;
	// The line to put the cursor on, from 1.
	line?: number | undefined;
	// Keeps its tab open; otherwise the next file opened may reuse it.
	keep?: boolean | undefined;
	// False leaves focus where it is, as a click in a list of files does.
	focus?: boolean | undefined;
};

export type PickItem = {
	id: string;
	label: string;
	detail?: string;
	// Paths and branch names are set in the mono font.
	mono?: boolean;
};

// A list to pick one item from, shown in the app's palette.
export type PickSource = {
	// Names the dialog for screen readers.
	label: string;
	placeholder: string;
	// The items matching what was typed, best first.
	items(query: string): readonly PickItem[];
	// Shown when `items` is empty.
	empty(query: string): string;
	accept(item: PickItem): void;
};

// What a panel shows a terminal on.
export type TerminalScreen = {
	size(): TerminalSize;
	// Starts over with what is on the terminal, as escape sequences.
	reset(data: string): void;
	// Shows the output that follows; `shown` is called once the screen has
	// taken it in, which is what keeps a fast program in step.
	write(data: string, shown: () => void): void;
	// The terminal could not be shown.
	fail(problem: string): void;
};

// A screen's connection to its terminal. It attaches again by itself after
// the app's core restarted.
export type TerminalLink = {
	// Input for the program in the terminal.
	write(data: string): void;
	resize(size: TerminalSize): void;
	// Leaves the terminal running.
	dispose(): void;
};

// The panel's worktree's terminals, which the app's core runs, so they go on
// while no panel shows them.
export type PanelTerminals = {
	// Calls `listener` with them, oldest first, as they are and after each
	// change.
	watch(listener: (terminals: readonly Terminal[]) => void): Disposable;
	// A new one in the worktree's folder, by its id. Its shell starts when a
	// screen first connects.
	create(): Promise<string>;
	// Ends its program.
	close(id: string): Promise<void>;
	connect(id: string, screen: TerminalScreen): TerminalLink;
};

// What one panel gets. Everything registered through it is disposed when the
// panel closes.
export type PanelContext = {
	// The worktree whose grid the panel is in.
	readonly worktree: Worktree;
	backend<P extends ProtocolDefinition>(protocol: P): PluginBackendClient<P>;
	readonly commands: {
		// Runs `handler` for a command the manifest contributes to this panel,
		// while the panel's worktree is the open one.
		register(command: string, handler: () => void): Disposable;
	};
	// Shows an element in the panel's header in place of its title, such as
	// tabs.
	readonly header: Attachment<HTMLElement>;
	// Closing the panel by command, as with Ctrl W, first asks `handler` to
	// close something inside it; false lets the panel close.
	handleClose(handler: () => boolean): Disposable;
	// Shows the panel that opens files, with the file in it.
	openFile(file: OpenFile): void;
	// For a panel whose manifest entry has `opensFiles`: takes the files to
	// open, the latest one asked for before it was there included.
	handleOpenFile(handler: (file: OpenFile) => void): Disposable;
	// Opens the palette on the source, while the panel's worktree is open.
	pick(source: PickSource): void;
	readonly terminals: PanelTerminals;
	// While focus is inside the element, keys go to it, except the ones the
	// app keeps for itself (the `keyboard.terminalAppKeys` setting). For a
	// terminal.
	readonly captureKeys: Attachment<HTMLElement>;
};

export type PanelProps = { panel: PanelContext };

export type PluginUi = {
	// One component per panel the manifest contributes, keyed by panel id.
	panels: Record<string, Component<PanelProps>>;
};
