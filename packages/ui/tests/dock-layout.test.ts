import { describe, expect, it } from "vitest";
import { parseDockLayout } from "../dock.ts";

const leaf = (id: string, views: string[], size: number) => ({
	type: "leaf",
	data: { views, activeView: views[0], id },
	size,
});
const panel = (id: string) => ({ id, contentComponent: id, title: id });

// The shape dockview 8.9.1's toJSON wrote for a three-group grid.
const saved = {
	grid: {
		root: {
			type: "branch",
			data: [
				leaf("1", ["changes"], 562),
				{
					type: "branch",
					data: [leaf("2", ["chat"], 600), leaf("3", ["terminal"], 518)],
					size: 1126,
				},
			],
			size: 1118,
		},
		width: 1688,
		height: 1118,
		orientation: "HORIZONTAL",
	},
	panels: {
		changes: panel("changes"),
		chat: panel("chat"),
		terminal: panel("terminal"),
	},
	activeGroup: "1",
};

describe("parseDockLayout", () => {
	it("reads back a layout dockview wrote", () => {
		expect(parseDockLayout(JSON.stringify(saved))).toEqual(saved);
	});

	it("drops fields the dock never sets", () => {
		const withFloating = { ...saved, floatingGroups: [{ position: {} }] };
		expect(parseDockLayout(JSON.stringify(withFloating))).toEqual(saved);
	});

	it("rejects text that is not a layout", () => {
		expect(parseDockLayout("not json")).toBeUndefined();
		expect(parseDockLayout(JSON.stringify({ grid: {} }))).toBeUndefined();
		const badOrientation = {
			...saved,
			grid: { ...saved.grid, orientation: "DIAGONAL" },
		};
		expect(parseDockLayout(JSON.stringify(badOrientation))).toBeUndefined();
	});

	it("rejects a group that lists a panel the layout lacks", () => {
		const { terminal: _, ...panels } = saved.panels;
		expect(
			parseDockLayout(JSON.stringify({ ...saved, panels })),
		).toBeUndefined();
	});
});
