import type { EditorTarget } from "@yaa/contracts/worktree-files";
import type { TabsState } from "../protocol.ts";

const CLOSED_LIMIT = 20;
export const NO_TABS: TabsState = { open: [], active: null, closed: [] };

export const targetKey = (target: EditorTarget): string =>
	JSON.stringify(
		target.kind === "file"
			? ["file", target.path]
			: ["diff", target.section, target.path],
	);

const has = (tabs: TabsState, id: string) =>
	tabs.open.some((tab) => targetKey(tab.target) === id);

export const keepTab = (tabs: TabsState, id: string): TabsState => ({
	...tabs,
	open: tabs.open.map((tab) =>
		targetKey(tab.target) === id ? { ...tab, preview: false } : tab,
	),
});

export const activateTab = (tabs: TabsState, id: string): TabsState =>
	has(tabs, id) ? { ...tabs, active: id } : tabs;

export const openTab = (
	tabs: TabsState,
	target: EditorTarget,
	keep: boolean,
): TabsState => {
	const id = targetKey(target);
	if (has(tabs, id)) {
		const shown = activateTab(tabs, id);
		return keep ? keepTab(shown, id) : shown;
	}
	const tab = { target, preview: !keep };
	const preview = keep ? -1 : tabs.open.findIndex((other) => other.preview);
	const open =
		preview < 0
			? tabs.open.toSpliced(
					tabs.open.findIndex(
						(other) => targetKey(other.target) === tabs.active,
					) + 1,
					0,
					tab,
				)
			: tabs.open.toSpliced(preview, 1, tab);
	return { ...tabs, open, active: id };
};

export const closeTab = (tabs: TabsState, id: string): TabsState => {
	const index = tabs.open.findIndex((tab) => targetKey(tab.target) === id);
	const closing = tabs.open[index];
	if (closing === undefined) return tabs;
	const open = tabs.open.toSpliced(index, 1);
	const next = open[index] ?? open.at(-1);
	return {
		open,
		active:
			tabs.active === id
				? next === undefined
					? null
					: targetKey(next.target)
				: tabs.active,
		closed: [
			...tabs.closed.filter((other) => targetKey(other) !== id),
			closing.target,
		].slice(-CLOSED_LIMIT),
	};
};

export const reopenTab = (tabs: TabsState): TabsState => {
	const closed = tabs.closed.filter((target) => !has(tabs, targetKey(target)));
	const target = closed.pop();
	return target === undefined
		? { ...tabs, closed }
		: openTab({ ...tabs, closed }, target, true);
};

export const cycleTab = (tabs: TabsState, step: 1 | -1): TabsState => {
	const index = tabs.open.findIndex(
		(tab) => targetKey(tab.target) === tabs.active,
	);
	const next = tabs.open.at((index + step) % tabs.open.length);
	return next === undefined
		? tabs
		: { ...tabs, active: targetKey(next.target) };
};

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
