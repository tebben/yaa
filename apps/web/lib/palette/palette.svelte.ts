import { matchCommands } from "@yaa/commands/command-match";
import type { PaletteEntry } from "../commands/index.ts";

type PaletteOptions = {
	// The commands to offer, in the context the palette opens in.
	commands(): readonly PaletteEntry[];
	run(id: string): void;
};

// The command palette: what was typed, the commands that match it and the
// selected one. Its keys are commands too (default-keybindings.ts).
export const createPalette = ({ commands, run }: PaletteOptions) => {
	let open = $state(false);
	let query = $state("");
	let selected = $state(0);
	let offered = $state.raw<readonly PaletteEntry[]>([]);
	// Where focus was before, so closing gives it back.
	let returnFocus: HTMLElement | undefined;
	const entries = $derived(matchCommands(query, offered));

	const hide = () => {
		if (!open) return;
		open = false;
		returnFocus?.focus();
		returnFocus = undefined;
	};

	const move = (step: 1 | -1) => {
		const count = entries.length;
		if (count > 0) selected = (selected + step + count) % count;
	};

	return {
		get open() {
			return open;
		},
		get query() {
			return query;
		},
		set query(text: string) {
			query = text;
			selected = 0;
		},
		get entries(): readonly PaletteEntry[] {
			return entries;
		},
		get selected() {
			return selected;
		},
		show() {
			if (open) return;
			offered = commands();
			query = "";
			selected = 0;
			const active = document.activeElement;
			returnFocus = active instanceof HTMLElement ? active : undefined;
			open = true;
		},
		hide,
		next: () => move(1),
		previous: () => move(-1),
		select(index: number) {
			selected = index;
		},
		// Closes first, so the command runs where the user was.
		runSelected() {
			const command = entries[selected];
			hide();
			if (command !== undefined) run(command.id);
		},
	};
};

export type PaletteController = ReturnType<typeof createPalette>;
