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
} from "../tabs.ts";

const paths = (tabs: TabsState) => tabs.open.map((tab) => tab.path);
const three = ["a", "b", "c"].reduce(
	(tabs, path) => openTab(tabs, path, true),
	NO_TABS,
);

describe("tabs", () => {
	it("reuses the preview tab where it stands", () => {
		const tabs = openTab(openTab(three, "p", false), "q", false);
		expect(paths(tabs)).toEqual(["a", "b", "c", "q"]);
		expect(tabs.active).toBe("q");
	});

	it("leaves a kept tab and opens the next preview after it", () => {
		const kept = keepTab(openTab(NO_TABS, "p", false), "p");
		expect(paths(openTab(kept, "q", false))).toEqual(["p", "q"]);
	});

	it("shows an open file in its tab, keeping it when asked", () => {
		const preview = openTab(three, "p", false);
		expect(openTab(preview, "p", false).open.at(-1)?.preview).toBe(true);
		const again = openTab(preview, "p", true);
		expect(again.open).toHaveLength(4);
		expect(again.open.at(-1)?.preview).toBe(false);
	});

	it("shows the neighbour of a closed active tab", () => {
		expect(closeTab(openTab(three, "b", true), "b").active).toBe("c");
		expect(closeTab(three, "c").active).toBe("b");
		expect(closeTab(three, "a").active).toBe("c");
		expect(closeTab(openTab(NO_TABS, "a", true), "a").active).toBeNull();
	});

	it("reopens closed tabs, latest first, skipping open ones", () => {
		const closed = closeTab(closeTab(three, "a"), "b");
		const opened = openTab(closed, "b", true);
		const back = reopenTab(opened);
		expect(back.active).toBe("a");
		expect(back.closed).toEqual([]);
		expect(reopenTab(back)).toEqual(back);
	});

	it("cycles around both ends", () => {
		expect(cycleTab(three, 1).active).toBe("a");
		expect(cycleTab(openTab(three, "a", true), -1).active).toBe("c");
		expect(cycleTab(NO_TABS, 1)).toEqual(NO_TABS);
	});

	it("names a folder only where file names clash", () => {
		expect(tabLabels(["x/index.ts", "y/index.ts", "y/a.ts"])).toEqual([
			{ path: "x/index.ts", name: "index.ts", folder: "x" },
			{ path: "y/index.ts", name: "index.ts", folder: "y" },
			{ path: "y/a.ts", name: "a.ts", folder: undefined },
		]);
	});
});
