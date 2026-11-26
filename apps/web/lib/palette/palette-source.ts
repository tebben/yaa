// One row the palette lists: a label, and optionally its first key and,
// on the right, a detail such as the command's category.
export type PaletteItem = {
	id: string;
	label: string;
	detail?: string;
	keys?: readonly string[];
	// Branch names and paths are set in the mono font.
	mono?: boolean;
};

// What the palette is picking from: the commands, or the steps of one, such
// as the branch a new worktree starts from.
export type PaletteSource = {
	// Names the dialog for screen readers.
	label: string;
	placeholder: string;
	// Lines above the list, such as what finishing a worktree would lose.
	notes?: readonly string[];
	items(query: string): readonly PaletteItem[];
	// Shown when `items` is empty.
	empty(query: string): string;
	// Runs after the palette has closed and given focus back, so a command
	// runs where the user was, and may open the palette again.
	accept(item: PaletteItem, query: string): void;
};
