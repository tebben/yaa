import type { LogRecord } from "@yaa/contracts/log";
import { describe, expect, it } from "vitest";
import { createRecentLogs } from "../log.ts";

const record = (message: string): LogRecord => ({
	at: 0,
	level: "debug",
	source: "core",
	message,
});

describe("recent logs", () => {
	it("keeps the last lines in order, numbered from the first ever logged", () => {
		const logs = createRecentLogs(3);
		const heard: number[] = [];
		logs.onAdd(({ seq }) => heard.push(seq));
		for (const n of [0, 1, 2, 3, 4]) logs.add(record(`line ${n}`));
		const { records, next } = logs.list();
		expect(records.map(({ seq, record }) => [seq, record.message])).toEqual([
			[2, "line 2"],
			[3, "line 3"],
			[4, "line 4"],
		]);
		expect(next).toBe(5);
		expect(heard).toEqual([0, 1, 2, 3, 4]);
	});
});
