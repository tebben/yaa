import { fuzzyMatch } from "@yaa/commands/fuzzy-match";
import { keyParts } from "@yaa/commands/key-chord";
import type { PaletteEntry } from "../commands/index.ts";
import type { PaletteItem, PaletteSource } from "./palette-source.ts";

type PaletteOptions = {
	// The commands to offer, in the context the palette opens in.
	commands(): readonly PaletteEntry[];
	keysFor(id: string): readonly string[];
	run(id: string): void;
};

// The command palette: what it picks from, what was typed, the items that
// match it and the selected one. It lists the commands, or the choices a
// command asks for. Its keys are commands too (default-keybindings.ts).
export const createPalette = ({ commands, keysFor, run }: PaletteOptions) => {
	let source = $state.raw<PaletteSource>();
	let query = $state("");
	let selected = $state(0);
	// Where focus was before, so closing gives it back.
	let returnFocus: HTMLElement | undefined;
	const items = $derived(source?.items(query) ?? []);

	// The palette matches a command's category and title together.
	const commandSource = (): PaletteSource => {
		const offered = commands();
		return {
			label: "Command palette",
			placeholder: "Type a command",
			items: (typed) =>
				fuzzyMatch(
					typed,
					offered,
					({ category, title }) => `${category ?? ""} ${title}`,
				).map(({ id, title, category }): PaletteItem => {
					const [key] = keysFor(id);
					return {
						id,
						label: title,
						...(category === undefined ? {} : { detail: category }),
						...(key === undefined ? {} : { keys: keyParts(key) }),
					};
				}),
			empty: () => "No matching commands",
			accept: ({ id }) => run(id),
		};
	};

	const hide = () => {
		if (source === undefined) return;
		source = undefined;
		returnFocus?.focus();
		returnFocus = undefined;
	};

	const pick = (next: PaletteSource) => {
		if (source === undefined) {
			const active = document.activeElement;
			returnFocus = active instanceof HTMLElement ? active : undefined;
		}
		source = next;
		query = "";
		selected = 0;
	};

	const move = (step: 1 | -1) => {
		const count = items.length;
		if (count > 0) selected = (selected + step + count) % count;
	};

	return {
		get open() {
			return source !== undefined;
		},
		get source() {
			return source;
		},
		get query() {
			return query;
		},
		set query(text: string) {
			query = text;
			selected = 0;
		},
		get items(): readonly PaletteItem[] {
			return items;
		},
		get selected() {
			return selected;
		},
		show() {
			if (source === undefined) pick(commandSource());
		},
		pick,
		hide,
		next: () => move(1),
		previous: () => move(-1),
		select(index: number) {
			selected = index;
		},
		// Closes first, so what the item does happens where the user was.
		runSelected() {
			const item = items[selected];
			const picked = source;
			const typed = query;
			hide();
			if (item !== undefined) picked?.accept(item, typed);
		},
	};
};

export type PaletteController = ReturnType<typeof createPalette>;
