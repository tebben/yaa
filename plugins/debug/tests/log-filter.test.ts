import type { LogRecord } from "@yaa/contracts/log";
import { describe, expect, it } from "vitest";
import { initialFilter, matches } from "../log-filter.ts";

const record = (fields: Partial<LogRecord>): LogRecord => ({
	at: 0,
	level: "info",
	source: "core",
	message: "line",
	...fields,
});

describe("log filter", () => {
	it("shows lines at or above the level, from the source, about the worktree", () => {
		const filter = { ...initialFilter, level: "warn" as const };
		expect(matches(record({ level: "info" }), filter, "w1")).toBe(false);
		expect(matches(record({ level: "error" }), filter, "w1")).toBe(true);

		const agent = { ...initialFilter, source: "agent" as const };
		expect(matches(record({ source: "core" }), agent, "w1")).toBe(false);
		expect(matches(record({ source: "agent" }), agent, "w1")).toBe(true);

		const own = { ...initialFilter, worktree: "this" as const };
		expect(matches(record({ worktree: "w1" }), own, "w1")).toBe(true);
		expect(matches(record({ worktree: "w2" }), own, "w1")).toBe(false);
		expect(matches(record({}), own, "w1")).toBe(false);
		expect(matches(record({ worktree: "w2" }), initialFilter, "w1")).toBe(true);
	});
});
