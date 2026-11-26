import type { Project } from "@yaa/contracts/projects";
import { describe, expect, it } from "vitest";
import { createProjects } from "../projects.ts";
import { openDatabase } from "../storage.ts";

// A git where /repo, and any folder under it, is one repository with
// default branch main; anything else is no repository.
const fakeGit = {
	async mainCheckout(dir: string) {
		if (!dir.startsWith("/repo")) throw new Error("not a git repository");
		return "/repo";
	},
	defaultBranch: async () => "main",
	status: async () => ({
		branch: "main",
		upstream: null,
		ahead: 0,
		behind: 0,
		changes: 3,
	}),
};

const setup = (db = openDatabase(":memory:")) => {
	let id = 0;
	return createProjects({
		db,
		git: fakeGit,
		home: "/repo",
		newId: () => `p${++id}`,
	});
};

describe("projects", () => {
	it("adds a repository by its main checkout, from any folder in it", async () => {
		const projects = setup();
		const changes: Project[][] = [];
		projects.onChange((list) => changes.push(list));
		const expected = {
			id: "p1",
			name: "repo",
			path: "/repo",
			defaultBranch: "main",
		};
		await expect(projects.add(" /repo/src ")).resolves.toEqual({
			project: expected,
		});
		expect(projects.list()).toEqual([expected]);
		expect(changes).toEqual([[expected]]);
	});

	it("reads a leading ~ as the home folder", async () => {
		const result = await setup().add("~/src");
		expect(result).toMatchObject({ project: { path: "/repo" } });
	});

	it("says why it cannot add a folder, and adds nothing", async () => {
		const projects = setup();
		await expect(projects.add("relative/path")).resolves.toEqual({
			problem: expect.stringContaining("full path"),
		});
		await expect(projects.add("/elsewhere")).resolves.toEqual({
			problem: "not a git repository",
		});
		await projects.add("/repo");
		await expect(projects.add("/repo/docs")).resolves.toEqual({
			problem: "/repo is already in the list",
		});
		expect(projects.list()).toHaveLength(1);
	});

	it("keeps the list in the database and removes a project from it", async () => {
		const db = openDatabase(":memory:");
		const projects = setup(db);
		await projects.add("/repo");
		expect(setup(db).list()).toHaveLength(1);
		const changes: Project[][] = [];
		projects.onChange((list) => changes.push(list));
		projects.remove("p1");
		projects.remove("p1");
		expect(projects.list()).toEqual([]);
		expect(changes).toEqual([[]]);
	});

	it("gives the status of the main checkout", async () => {
		const projects = setup();
		await projects.add("/repo");
		await expect(projects.status("p1")).resolves.toMatchObject({ changes: 3 });
		await expect(projects.status("p9")).rejects.toThrow("No project p9");
	});
});
