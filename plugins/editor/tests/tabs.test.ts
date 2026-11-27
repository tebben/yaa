import { describe, expect, it } from "vitest";
import type { TabsState } from "../protocol.ts";
import {
	closeTab,
	cycleTab,
	keepTab,
	NO_TABS,
	openTab,
	reopenTab,
	tabLabels,
	targetKey,
} from "../tabs.ts";

const file = (path: string) => ({ kind: "file" as const, path });
const key = (path: string) => targetKey(file(path));
const paths = (tabs: TabsState) => tabs.open.map((tab) => tab.target.path);
const three = ["a", "b", "c"].reduce(
	(tabs, path) => openTab(tabs, file(path), true),
	NO_TABS,
);

describe("tabs", () => {
	it("reuses the preview tab where it stands", () => {
		const tabs = openTab(openTab(three, file("p"), false), file("q"), false);
		expect(paths(tabs)).toEqual(["a", "b", "c", "q"]);
		expect(tabs.active).toBe(key("q"));
	});

	it("leaves a kept tab and opens the next preview after it", () => {
		const kept = keepTab(openTab(NO_TABS, file("p"), false), key("p"));
		expect(paths(openTab(kept, file("q"), false))).toEqual(["p", "q"]);
	});

	it("shows an open file in its tab, keeping it when asked", () => {
		const preview = openTab(three, file("p"), false);
		expect(openTab(preview, file("p"), false).open.at(-1)?.preview).toBe(true);
		const again = openTab(preview, file("p"), true);
		expect(again.open).toHaveLength(4);
		expect(again.open.at(-1)?.preview).toBe(false);
	});

	it("shows the neighbour of a closed active tab", () => {
		expect(closeTab(openTab(three, file("b"), true), key("b")).active).toBe(
			key("c"),
		);
		expect(closeTab(three, key("c")).active).toBe(key("b"));
		expect(closeTab(three, key("a")).active).toBe(key("c"));
		expect(
			closeTab(openTab(NO_TABS, file("a"), true), key("a")).active,
		).toBeNull();
	});

	it("reopens closed tabs, latest first, skipping open ones", () => {
		const closed = closeTab(closeTab(three, key("a")), key("b"));
		const opened = openTab(closed, file("b"), true);
		const back = reopenTab(opened);
		expect(back.active).toBe(key("a"));
		expect(back.closed).toEqual([]);
		expect(reopenTab(back)).toEqual(back);
	});

	it("cycles around both ends", () => {
		expect(cycleTab(three, 1).active).toBe(key("a"));
		expect(cycleTab(openTab(three, file("a"), true), -1).active).toBe(key("c"));
		expect(cycleTab(NO_TABS, 1)).toEqual(NO_TABS);
	});

	it("keeps a file, staged diff and unstaged diff in distinct tabs", () => {
		const staged = {
			kind: "diff" as const,
			path: "a",
			section: "staged" as const,
		};
		const unstaged = {
			kind: "diff" as const,
			path: "a",
			section: "unstaged" as const,
		};
		const tabs = openTab(
			openTab(openTab(NO_TABS, file("a"), true), staged, true),
			unstaged,
			true,
		);
		expect(tabs.open).toHaveLength(3);
		expect(reopenTab(closeTab(tabs, targetKey(staged))).active).toBe(
			targetKey(staged),
		);
	});

	it("names a folder only where file names clash", () => {
		expect(tabLabels(["x/index.ts", "y/index.ts", "y/a.ts"])).toEqual([
			{ path: "x/index.ts", name: "index.ts", folder: "x" },
			{ path: "y/index.ts", name: "index.ts", folder: "y" },
			{ path: "y/a.ts", name: "a.ts", folder: undefined },
		]);
	});
});
