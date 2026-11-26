import { FitAddon } from "@xterm/addon-fit";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import {
	TERMINAL_SCROLLBACK,
	TERMINAL_UNICODE,
} from "@yaa/contracts/terminals";
import type { PanelTerminals, TerminalLink } from "@yaa/plugin-api/ui";
import { optionsFromTokens } from "./xterm-options.svelte.ts";

type ViewOptions = {
	id: string;
	terminals: PanelTerminals;
	fail(problem: string): void;
};

// One terminal on screen: an xterm.js terminal in an element of its own,
// which can be moved in and out of the page. It connects to its terminal once
// it first has a size, so the program starts at that size.
export const createTerminalView = ({ id, terminals, fail }: ViewOptions) => {
	const element = document.createElement("div");
	element.className = "view";
	const options = optionsFromTokens(document.documentElement);
	const terminal = new Terminal({
		...options,
		scrollback: TERMINAL_SCROLLBACK,
		// The unicode addon needs it.
		allowProposedApi: true,
	});
	const fit = new FitAddon();
	terminal.loadAddon(fit);
	terminal.loadAddon(new Unicode11Addon());
	terminal.unicode.activeVersion = TERMINAL_UNICODE;

	let link: TerminalLink | undefined;
	// Asked to take focus before it was on screen.
	let wantsFocus = false;
	terminal.onData((data) => link?.write(data));
	terminal.onResize(({ cols, rows }) => link?.resize({ cols, rows }));

	// xterm measures its cells as it opens, which is off until the font is in,
	// and keeps each glyph as first drawn, so the icons' font has to be in too:
	// the second character asks for it.
	const font = document.fonts.load(
		`${options.fontSize}px ${options.fontFamily}`,
		"a\ue0a0",
	);

	const layOut = () => {
		// Hidden, or out of the page: there is nothing to measure.
		if (element.clientWidth === 0 || element.clientHeight === 0) return;
		if (terminal.element === undefined) terminal.open(element);
		fit.fit();
		link ??= terminals.connect(id, {
			size: () => ({ cols: terminal.cols, rows: terminal.rows }),
			// A full reset in the stream, so it lands after what was written before.
			reset: (data) => terminal.write(`\x1bc${data}`),
			write: (data, shown) => terminal.write(data, shown),
			fail,
		});
		if (wantsFocus) {
			wantsFocus = false;
			terminal.focus();
		}
	};
	const resizing = new ResizeObserver(() => void font.then(layOut, fail));
	resizing.observe(element);

	// Only a terminal on screen holds a WebGL context, of which a page has few.
	let webgl: WebglAddon | undefined;
	let withoutWebgl = false;
	const dropWebgl = () => {
		webgl?.dispose();
		webgl = undefined;
	};
	const useWebgl = () => {
		if (webgl !== undefined || withoutWebgl) return;
		if (terminal.element === undefined) return;
		const addon = new WebglAddon();
		// The browser takes contexts back; the terminal then draws without.
		addon.onContextLoss(dropWebgl);
		try {
			terminal.loadAddon(addon);
			webgl = addon;
		} catch (error) {
			// A machine without WebGL draws with the DOM.
			withoutWebgl = true;
			console.warn("The terminal draws without WebGL", error);
		}
	};
	const showing = new IntersectionObserver(([entry]) => {
		if (!entry?.isIntersecting) dropWebgl();
		else
			void font.then(() => {
				layOut();
				useWebgl();
			}, fail);
	});
	showing.observe(element);

	return {
		element,
		focus() {
			if (terminal.element === undefined || !element.isConnected) {
				wantsFocus = true;
			} else terminal.focus();
		},
		copy() {
			if (!terminal.hasSelection()) return;
			terminal.focus();
			// xterm puts its selection on the clipboard when the page copies; the
			// clipboard API needs a permission the app grants no page.
			document.execCommand("copy");
		},
		dispose() {
			resizing.disconnect();
			showing.disconnect();
			link?.dispose();
			dropWebgl();
			terminal.dispose();
			element.remove();
		},
	};
};

export type TerminalView = ReturnType<typeof createTerminalView>;
