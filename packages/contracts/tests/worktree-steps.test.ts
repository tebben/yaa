import { describe, expect, it } from "vitest";
import { worktreeSteps } from "../worktree-steps.ts";

describe("worktreeSteps", () => {
	it("takes any of the lists, the others empty", () => {
		expect(worktreeSteps.parse({ setup: ["pnpm install"] })).toEqual({
			copy: [],
			setup: ["pnpm install"],
			teardown: [],
		});
	});

	it("refuses an unknown field, an empty entry and anything but lists", () => {
		for (const file of [
			{ setups: [] },
			{ copy: [""] },
			{ teardown: "make down" },
			[],
		]) {
			expect(worktreeSteps.safeParse(file).success).toBe(false);
		}
	});
});
