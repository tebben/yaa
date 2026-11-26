import { TERMINAL_ACK_CHARS } from "@yaa/contracts/terminals";
import { describe, expect, it } from "vitest";
import { createTerminalFeed } from "../terminal-feed.ts";

const setup = () => {
	const shown: string[] = [];
	const acked: number[] = [];
	const feed = createTerminalFeed({
		screen: {
			reset: (data) => shown.push(`reset:${data}`),
			write(data, done) {
				shown.push(data);
				done();
			},
		},
		ack: (offset) => acked.push(offset),
	});
	return { feed, shown, acked };
};

describe("createTerminalFeed", () => {
	it("shows the snapshot first, then only what followed it", () => {
		const { feed, shown } = setup();
		feed.output({ id: "t", data: "ab", offset: 2 });
		feed.output({ id: "t", data: "cd", offset: 4 });
		expect(shown).toEqual([]);
		feed.snapshot({ data: "ab", offset: 2 });
		feed.output({ id: "t", data: "ef", offset: 6 });
		expect(shown).toEqual(["reset:ab", "cd", "ef"]);
	});

	it("says how far it is only after enough output since the last time", () => {
		const { feed, acked } = setup();
		feed.snapshot({ data: "", offset: 100 });
		feed.output({ id: "t", data: "x", offset: 100 + TERMINAL_ACK_CHARS - 1 });
		expect(acked).toEqual([]);
		feed.output({ id: "t", data: "x", offset: 100 + TERMINAL_ACK_CHARS });
		feed.output({ id: "t", data: "x", offset: 101 + TERMINAL_ACK_CHARS });
		expect(acked).toEqual([100 + TERMINAL_ACK_CHARS]);
	});
});
