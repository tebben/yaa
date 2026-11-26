import { describe, expect, it } from "vitest";
import { createProjects, createWorktrees } from "../projects.ts";
import { openDatabase } from "../storage.ts";

// A git where /repo, and any folder under it, is one repository with
// default branch main, a local branch `feature` and origin's `main` and
// `fix`; anything else is no repository. Shared commands are recorded, and
// one that names a folder in `failing` fails.
const fakeGit = (failing: readonly string[] = []) => {
	const shared: string[] = [];
	return {
		shared,
		git: {
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
			branches: async () => ({
				local: ["feature", "main"],
				remote: ["origin/fix", "origin/main"],
			}),
			unpushed: async () => 2,
			upstream: async (_repo: string, branch: string) =>
				branch === "feature"
					? { remote: "origin", branch: "feature" }
					: undefined,
			async shared(repo: string, args: readonly string[]) {
				const line = [repo, ...args].join(" ");
				shared.push(line);
				if (failing.some((word) => args.includes(word))) {
					throw new Error(`cannot ${args[0]}`);
				}
				return "";
			},
		},
	};
};

const settings = () => ({
	"worktree.directory": "~/wt",
	"worktree.branchTemplate": "{ticketId}-{slug}",
	"worktree.ticketPrefix": "PROJ-",
});

const setup = ({
	db = openDatabase(":memory:"),
	failing = [] as readonly string[],
	// The folders that exist; a test adds one after creating its worktree.
	folders = new Set<string>(),
} = {}) => {
	let id = 0;
	const newId = () => `id${++id}`;
	const { git, shared } = fakeGit(failing);
	const projects = createProjects({ db, git, home: "/repo", newId });
	const worktrees = createWorktrees({
		db,
		git,
		settings,
		home: "/home/me",
		exists: (path) => folders.has(path),
		newId,
	});
	return { db, projects, worktrees, shared, folders };
};

const main = { id: "id2", branch: "main", path: "/repo", index: 0 };

describe("projects", () => {
	it("adds a repository by its main checkout, from any folder in it, with the main checkout as its first worktree", async () => {
		const { projects } = setup();
		let changes = 0;
		projects.onChange(() => {
			changes += 1;
		});
		const expected = {
			id: "id1",
			name: "repo",
			path: "/repo",
			defaultBranch: "main",
			worktrees: [main],
		};
		await expect(projects.add(" /repo/src ")).resolves.toEqual({
			project: expected,
		});
		expect(projects.list()).toEqual([expected]);
		expect(changes).toBe(1);
	});

	it("reads a leading ~ as the home folder", async () => {
		const result = await setup().projects.add("~/src");
		expect(result).toMatchObject({ project: { path: "/repo" } });
	});

	it("says why it cannot add a folder, and adds nothing", async () => {
		const { projects } = setup();
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

	it("keeps the list in the database and removes a project with its worktrees", async () => {
		const db = openDatabase(":memory:");
		const { projects, worktrees } = setup({ db });
		await projects.add("/repo");
		await worktrees.create({ project: "id1", text: "1", base: "main" });
		expect(setup({ db }).projects.list()).toHaveLength(1);
		let changes = 0;
		projects.onChange(() => {
			changes += 1;
		});
		projects.remove("id1");
		projects.remove("id1");
		expect(projects.list()).toEqual([]);
		expect(changes).toBe(1);
		expect(db.prepare("SELECT count(*) AS n FROM worktrees").get()).toEqual({
			n: 0,
		});
	});
});

describe("worktrees", () => {
	const withProject = async (options: Parameters<typeof setup>[0] = {}) => {
		const made = setup(options);
		await made.projects.add("/repo");
		return made;
	};

	it("creates a named branch from the base under the worktree folder, with the next free index", async () => {
		const { projects, worktrees, shared } = await withProject();
		const first = await worktrees.create({
			project: "id1",
			text: "482 fix tile cache",
			base: "origin/main",
		});
		expect(first).toEqual({
			worktree: {
				id: "id3",
				branch: "PROJ-482-fix-tile-cache",
				path: "/home/me/wt/repo/PROJ-482-fix-tile-cache",
				index: 1,
			},
		});
		expect(shared).toEqual([
			"/repo worktree add --no-track -b PROJ-482-fix-tile-cache /home/me/wt/repo/PROJ-482-fix-tile-cache origin/main",
		]);
		await worktrees.create({ project: "id1", text: "2", base: "main" });
		await worktrees.finish("id3", "close", false);
		await worktrees.create({ project: "id1", text: "3", base: "main" });
		expect(
			projects.list()[0]?.worktrees.map(({ branch, index }) => [branch, index]),
		).toEqual([
			["main", 0],
			["PROJ-2", 2],
			["PROJ-3", 1],
		]);
	});

	it("checks out the base itself without a name, a remote one as a tracking branch", async () => {
		const { worktrees, shared } = await withProject();
		await worktrees.create({ project: "id1", text: " ", base: "feature" });
		await worktrees.create({ project: "id1", text: "", base: "origin/fix" });
		await worktrees.create({ project: "id1", text: "", base: "origin/main" });
		expect(shared).toEqual([
			"/repo worktree add /home/me/wt/repo/feature feature",
			"/repo worktree add --track -b fix /home/me/wt/repo/fix origin/fix",
			"/repo worktree add /home/me/wt/repo/main main",
		]);
	});

	it("says why it cannot create, and adds nothing", async () => {
		const { projects, worktrees } = await withProject({
			failing: ["add"],
			folders: new Set(["/home/me/wt/repo/PROJ-9"]),
		});
		const problem = (text: string, base = "main") =>
			worktrees.create({ project: "id1", text, base });
		await expect(problem("!!")).resolves.toEqual({
			problem: "Type a name or a ticket id",
		});
		await expect(problem("feature")).resolves.toEqual({
			problem: expect.stringContaining("exists already"),
		});
		await expect(problem("", "nope")).resolves.toEqual({
			problem: "No branch nope",
		});
		await expect(problem("9")).resolves.toEqual({
			problem: "/home/me/wt/repo/PROJ-9 exists already",
		});
		await expect(problem("10")).resolves.toEqual({
			problem: "cannot worktree",
		});
		expect(projects.list()[0]?.worktrees).toEqual([main]);
	});

	it("tells what finishing would lose, and never finishes the main checkout", async () => {
		const { worktrees, folders } = await withProject();
		await worktrees.create({ project: "id1", text: "", base: "feature" });
		await worktrees.create({ project: "id1", text: "", base: "origin/fix" });
		folders.add("/home/me/wt/repo/feature");
		await expect(worktrees.finishCheck("id3")).resolves.toEqual({
			folder: true,
			changes: 3,
			unpushed: 2,
			remoteBranch: "origin/feature",
		});
		await expect(worktrees.finishCheck("id4")).resolves.toMatchObject({
			folder: false,
			changes: 0,
			remoteBranch: null,
		});
		await expect(worktrees.finishCheck("id2")).rejects.toThrow("main checkout");
		await expect(worktrees.finish("id2", "close", false)).rejects.toThrow(
			"main checkout",
		);
	});

	it("removes the folder, then deletes the branch here and on the remote", async () => {
		const { projects, worktrees, shared, folders } = await withProject();
		await worktrees.create({ project: "id1", text: "", base: "feature" });
		await worktrees.create({ project: "id1", text: "", base: "origin/fix" });
		folders.add("/home/me/wt/repo/feature");
		shared.length = 0;
		await expect(
			worktrees.finish("id3", "deleteRemote", true),
		).resolves.toEqual({});
		await expect(worktrees.finish("id4", "remove", false)).resolves.toEqual({});
		expect(shared).toEqual([
			"/repo worktree remove --force /home/me/wt/repo/feature",
			"/repo branch -D feature",
			"/repo push origin --delete feature",
			"/repo worktree prune",
		]);
		expect(projects.list()[0]?.worktrees).toEqual([main]);
	});

	it("keeps a worktree whose folder git will not remove, and forgets one whose branch it will not delete", async () => {
		const removeFails = await withProject({ failing: ["remove"] });
		await removeFails.worktrees.create({
			project: "id1",
			text: "1",
			base: "main",
		});
		removeFails.folders.add("/home/me/wt/repo/PROJ-1");
		await expect(
			removeFails.worktrees.finish("id3", "remove", false),
		).resolves.toEqual({ problem: "cannot worktree" });
		expect(removeFails.projects.list()[0]?.worktrees).toHaveLength(2);

		const branchFails = await withProject({ failing: ["-d"] });
		await branchFails.worktrees.create({
			project: "id1",
			text: "1",
			base: "main",
		});
		await expect(
			branchFails.worktrees.finish("id3", "deleteBranch", false),
		).resolves.toEqual({
			problem: "The worktree is removed, but: cannot branch",
		});
		expect(branchFails.projects.list()[0]?.worktrees).toEqual([main]);
	});
});
