import { describe, expect, it } from "vitest";
import { worktreeName } from "../worktree-name.ts";

const rules = { template: "{ticketId}-{slug}", ticketPrefix: "PROJ-" };

describe("worktreeName", () => {
	it("puts the ticket id and the slug into the template", () => {
		expect(worktreeName("PROJ-482 Fix tile cache!", rules)).toEqual({
			branch: "PROJ-482-fix-tile-cache",
			folder: "PROJ-482-fix-tile-cache",
		});
	});

	it("puts the default prefix before a bare number", () => {
		expect(worktreeName("123", rules)).toEqual({
			branch: "PROJ-123",
			folder: "PROJ-123",
		});
		expect(worktreeName("123: export dxf", rules)).toMatchObject({
			branch: "PROJ-123-export-dxf",
		});
		expect(worktreeName("geo-12 crs", rules)).toMatchObject({
			branch: "GEO-12-crs",
		});
	});

	it("reads text without a ticket as the slug only", () => {
		expect(worktreeName("Évite les 2 caches", rules)).toMatchObject({
			branch: "evite-les-2-caches",
		});
		expect(worktreeName("404s on reload", rules)).toMatchObject({
			branch: "404s-on-reload",
		});
	});

	it("drops the separators of an empty part, and makes / a - in the folder", () => {
		const nested = { template: "tim/{ticketId}_{slug}", ticketPrefix: "" };
		expect(worktreeName("fix it", nested)).toEqual({
			branch: "tim/fix-it",
			folder: "tim-fix-it",
		});
		expect(worktreeName("7", nested)).toMatchObject({ branch: "tim/7" });
	});

	it("cuts a long slug at a word", () => {
		const long = worktreeName("word ".repeat(20), rules);
		expect(long).toMatchObject({
			branch: expect.stringMatching(/^word(-word)*$/),
		});
		expect("branch" in long && long.branch.length).toBeLessThanOrEqual(48);
	});

	it("says what is wrong instead of naming", () => {
		expect(worktreeName("  !! ", rules)).toEqual({
			problem: "Type a name or a ticket id",
		});
		expect(
			worktreeName("x", { template: "{slug}~", ticketPrefix: "" }),
		).toMatchObject({ problem: expect.stringContaining("branchTemplate") });
	});
});
