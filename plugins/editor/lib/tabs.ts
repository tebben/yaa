import type { TabsState } from "../protocol.ts";

// How many closed tabs can be reopened.
const CLOSED_LIMIT = 20;

export const NO_TABS: TabsState = { open: [], active: null, closed: [] };

const has = (tabs: TabsState, path: string) =>
	tabs.open.some((tab) => tab.path === path);

// Makes the tab of `path` one that stays.
export const keepTab = (tabs: TabsState, path: string): TabsState => ({
	...tabs,
	open: tabs.open.map((tab) =>
		tab.path === path ? { path, preview: false } : tab,
	),
});

export const activateTab = (tabs: TabsState, path: string): TabsState =>
	has(tabs, path) ? { ...tabs, active: path } : tabs;

// Shows `path`: in its own tab when it has one, in the preview tab's place
// unless it is to be kept, or else in a new tab after the active one.
export const openTab = (
	tabs: TabsState,
	path: string,
	keep: boolean,
): TabsState => {
	if (has(tabs, path)) {
		const shown = activateTab(tabs, path);
		return keep ? keepTab(shown, path) : shown;
	}
	const tab = { path, preview: !keep };
	const preview = keep ? -1 : tabs.open.findIndex((other) => other.preview);
	const open =
		preview < 0
			? tabs.open.toSpliced(
					tabs.open.findIndex((other) => other.path === tabs.active) + 1,
					0,
					tab,
				)
			: tabs.open.toSpliced(preview, 1, tab);
	return { ...tabs, open, active: path };
};

// Closing the active tab shows the one that takes its place, or else the
// last.
export const closeTab = (tabs: TabsState, path: string): TabsState => {
	const index = tabs.open.findIndex((tab) => tab.path === path);
	if (index < 0) return tabs;
	const open = tabs.open.toSpliced(index, 1);
	return {
		open,
		active:
			tabs.active === path
				? ((open[index] ?? open.at(-1))?.path ?? null)
				: tabs.active,
		closed: [...tabs.closed.filter((other) => other !== path), path].slice(
			-CLOSED_LIMIT,
		),
	};
};

// Opens the tab closed last that is not open again.
export const reopenTab = (tabs: TabsState): TabsState => {
	const closed = tabs.closed.filter((path) => !has(tabs, path));
	const path = closed.pop();
	return path === undefined
		? { ...tabs, closed }
		: openTab({ ...tabs, closed }, path, true);
};

// The next or previous tab, wrapping around.
export const cycleTab = (tabs: TabsState, step: 1 | -1): TabsState => {
	const index = tabs.open.findIndex((tab) => tab.path === tabs.active);
	const next = tabs.open.at((index + step) % tabs.open.length);
	return next === undefined ? tabs : { ...tabs, active: next.path };
};

// What each tab is called: the file's name, with its folder beside it when
// another open file has the same name.
export const tabLabels = (
	paths: readonly string[],
): { path: string; name: string; folder: string | undefined }[] => {
	const split = paths.map((path) => {
		const slash = path.lastIndexOf("/");
		return {
			path,
			name: path.slice(slash + 1),
			folder: path.slice(0, Math.max(slash, 0)),
		};
	});
	return split.map(({ path, name, folder }) => ({
		path,
		name,
		folder:
			folder !== "" && split.filter((other) => other.name === name).length > 1
				? folder
				: undefined,
	}));
};
