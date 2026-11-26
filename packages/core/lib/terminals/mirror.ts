// The packages ship CommonJS, which Node imports as a default export only.
import serialize from "@xterm/addon-serialize";
import unicode11 from "@xterm/addon-unicode11";
import headless from "@xterm/headless";
import {
	TERMINAL_SCROLLBACK,
	TERMINAL_UNICODE,
	type TerminalSize,
} from "@yaa/contracts/terminals";

// A terminal without a screen, with the panel's engine, so a view that
// attaches later gets what the terminal shows
// (docs/spec/07-editor-files-terminal.md).
export type Mirror = {
	// `parsed` is called once the terminal has taken the data in.
	write(data: string, parsed: () => void): void;
	// The screen and scrollback as escape sequences, as they are once all that
	// was written before this call has been taken in.
	snapshot(): Promise<string>;
	// What the terminal answers to a program's query, such as its cursor's
	// position.
	onReply(listener: (data: string) => void): void;
	resize(size: TerminalSize): void;
	dispose(): void;
};

// Private modes the serialize addon leaves out, by what turns each on in a
// fresh terminal: SGR and pixel mouse reports, and a hidden cursor.
const UNSERIALIZED = [
	{ mode: 1006, set: true },
	{ mode: 1016, set: true },
	{ mode: 25, set: false },
];

export const createMirror = ({ cols, rows }: TerminalSize): Mirror => {
	const terminal = new headless.Terminal({
		cols,
		rows,
		scrollback: TERMINAL_SCROLLBACK,
		// The unicode and serialize addons need it.
		allowProposedApi: true,
	});
	const serializer = new serialize.SerializeAddon();
	terminal.loadAddon(serializer);
	terminal.loadAddon(new unicode11.Unicode11Addon());
	terminal.unicode.activeVersion = TERMINAL_UNICODE;

	// Whether each private mode was last turned on or off.
	const modes = new Map<number, boolean>();
	const track = (final: "h" | "l") =>
		terminal.parser.registerCsiHandler({ prefix: "?", final }, (params) => {
			for (const param of params) {
				if (typeof param === "number") modes.set(param, final === "h");
			}
			// The terminal handles the sequence as well.
			return false;
		});
	track("h");
	track("l");
	terminal.parser.registerEscHandler({ final: "c" }, () => {
		modes.clear();
		return false;
	});

	return {
		write(data, parsed) {
			terminal.write(data, parsed);
		},
		snapshot: () =>
			new Promise((resolve) => {
				// Writes are taken in order, so this runs once those before it are in.
				terminal.write("", () => {
					const restored = UNSERIALIZED.filter(
						({ mode, set }) => modes.get(mode) === set,
					).map(({ mode, set }) => `\x1b[?${mode}${set ? "h" : "l"}`);
					resolve(serializer.serialize() + restored.join(""));
				});
			}),
		onReply(listener) {
			terminal.onData(listener);
		},
		resize({ cols, rows }) {
			terminal.resize(cols, rows);
		},
		dispose() {
			terminal.dispose();
		},
	};
};
