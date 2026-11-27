import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLogger } from "@yaa/contracts/log";
import { describe, expect, it } from "vitest";
import { openLogFile } from "../log.ts";

const tempDir = () => mkdtempSync(join(tmpdir(), "yaa-log-"));
const lines = (path: string) =>
	readFileSync(path, "utf8")
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line));

describe("log file", () => {
	it("writes one JSON line per record at or above its level", () => {
		const dir = tempDir();
		const file = openLogFile({ dir, level: "info" });
		const log = createLogger(file.write, "core", () => 0);
		log.debug("hidden");
		log.forWorktree("w1").info("hello", { step: "copy" });
		log.error("broken");
		file.close();
		expect(lines(join(dir, "yaa.log"))).toEqual([
			{
				at: "1970-01-01T00:00:00.000Z",
				level: "info",
				source: "core",
				message: "hello",
				worktree: "w1",
				data: { step: "copy" },
			},
			{
				at: "1970-01-01T00:00:00.000Z",
				level: "error",
				source: "core",
				message: "broken",
			},
		]);
	});

	it("rotates before the file passes its size and keeps a fixed number of files", () => {
		// Every message has the same length, so every line has the same size.
		const text = (n: number) => `line ${n}`.padEnd(60, ".");
		const probe = tempDir();
		const probeFile = openLogFile({ dir: probe, level: "info" });
		createLogger(probeFile.write, "core", () => 0).info(text(0));
		probeFile.close();
		const lineBytes = statSync(join(probe, "yaa.log")).size;

		const dir = tempDir();
		const file = openLogFile({
			dir,
			level: "info",
			maxBytes: 3 * lineBytes,
			keep: 2,
		});
		const log = createLogger(file.write, "core", () => 0);
		for (let n = 0; n < 12; n++) log.info(text(n));
		file.close();

		expect(readdirSync(dir).sort()).toEqual([
			"yaa.1.log",
			"yaa.2.log",
			"yaa.log",
		]);
		const message = (path: string) =>
			lines(join(dir, path)).map((l) => l.message.slice(0, 7));
		expect(message("yaa.log")).toEqual(["line 9.", "line 10", "line 11"]);
		expect(message("yaa.1.log")).toEqual(["line 6.", "line 7.", "line 8."]);
		expect(message("yaa.2.log")).toEqual(["line 3.", "line 4.", "line 5."]);
	});
});
