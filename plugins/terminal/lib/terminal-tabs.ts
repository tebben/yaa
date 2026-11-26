import type { Terminal } from "@yaa/contracts/terminals";
import type { Tab } from "@yaa/ui";

// The tabs of a worktree's terminals: the running program, with the folder it
// is in when that is not the worktree's.
export const toTabs = (
	terminals: readonly Terminal[],
	root: string,
	selected: string | undefined,
): Tab[] =>
	terminals.map(({ id, title, cwd }) => ({
		id,
		name: title,
		detail: cwd === root ? undefined : cwd.slice(cwd.lastIndexOf("/") + 1),
		title: cwd,
		active: id === selected,
	}));

// The terminal to show once `selected` is not in the list: the one now where
// it was, or the last.
export const neighbour = (
	before: readonly Terminal[],
	after: readonly Terminal[],
	selected: string | undefined,
): string | undefined => {
	const index = Math.max(
		before.findIndex(({ id }) => id === selected),
		0,
	);
	return (after[index] ?? after.at(-1))?.id;
};
