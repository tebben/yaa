import { describe, expect, it } from "vitest";
import {
	createGitService,
	mainWorktree,
	parseBranches,
	parseStatus,
} from "../git.ts";

describe("parseStatus", () => {
	it("reads the branch, upstream, ahead and behind, and counts changed files", () => {
		const output = [
			"# branch.oid 1234",
			"# branch.head main",
			"# branch.upstream origin/main",
			"# branch.ab +2 -1",
			"1 .M N... 100644 100644 100644 aa bb src/a.ts",
			"2 R. N... 100644 100644 100644 aa bb R100 src/b.ts\tsrc/old.ts",
			"u UU N... 100644 100644 100644 100644 aa bb cc src/c.ts",
			"? notes.md",
			"",
		].join("\n");
		expect(parseStatus(output)).toEqual({
			branch: "main",
			upstream: "origin/main",
			ahead: 2,
			behind: 1,
			changes: 4,
		});
	});

	it("gives no branch when detached and no counts without an upstream", () => {
		expect(
			parseStatus("# branch.oid 1234\n# branch.head (detached)\n"),
		).toEqual({
			branch: null,
			upstream: null,
			ahead: 0,
			behind: 0,
			changes: 0,
		});
	});
});

describe("mainWorktree", () => {
	it("takes the first entry of the worktree list", () => {
		const output =
			"worktree /repo\nHEAD 1234\nbranch refs/heads/main\n\nworktree /wt/a\nHEAD 5678\nbranch refs/heads/a\n\n";
		expect(mainWorktree(output)).toEqual({ path: "/repo", bare: false });
		expect(mainWorktree("worktree /repo.git\nbare\n\n")).toEqual({
			path: "/repo.git",
			bare: true,
		});
		expect(mainWorktree("")).toBeUndefined();
	});
});

describe("parseBranches", () => {
	it("lists local branches, then remote ones without HEAD, each sorted", () => {
		const output = [
			"refs/heads/main",
			"refs/heads/feat/a",
			"refs/remotes/origin/HEAD",
			"refs/remotes/origin/main",
			"refs/remotes/fork/b",
			"",
		].join("\n");
		expect(parseBranches(output)).toEqual({
			local: ["feat/a", "main"],
			remote: ["fork/b", "origin/main"],
		});
	});
});

describe("git service", () => {
	// A git that records when each command starts and ends, and finishes a
	// command only when the test says so.
	const controlledGit = () => {
		const log: string[] = [];
		const finish = new Map<string, (out: string) => void>();
		const run = (dir: string, args: readonly string[]) => {
			const name = `${dir} ${args.join(" ")}`;
			log.push(`start ${name}`);
			return new Promise<string>((resolve, reject) => {
				finish.set(name, (out) => {
					log.push(`end ${name}`);
					if (out === "fail") reject(new Error(name));
					else resolve(out);
				});
			});
		};
		// The queue starts commands a tick after they are queued, and the
		// next one a tick after one ends.
		const settle = () => new Promise((resolve) => setImmediate(resolve));
		const end = async (name: string, out = "") => {
			await settle();
			finish.get(name)?.(out);
			await settle();
		};
		return { log, run, end };
	};

	it("runs shared commands one at a time per repository, in order, past a failure", async () => {
		const { log, run, end } = controlledGit();
		const git = createGitService(run);
		const first = git.shared("/a", ["fetch"]);
		const second = git.shared("/a", ["gc"]);
		const other = git.shared("/b", ["fetch"]);
		await end("/a fetch", "fail");
		await expect(first).rejects.toThrow("/a fetch");
		await end("/a gc", "done");
		await expect(second).resolves.toBe("done");
		await end("/b fetch");
		await other;
		expect(log).toEqual([
			"start /a fetch",
			"start /b fetch",
			"end /a fetch",
			"start /a gc",
			"end /a gc",
			"end /b fetch",
		]);
	});

	it("names the default branch from origin's HEAD, else the checked-out branch", async () => {
		const withRemote = createGitService(async (_dir, args) =>
			args.includes("refs/remotes/origin/HEAD") ? "origin/trunk\n" : "work\n",
		);
		await expect(withRemote.defaultBranch("/r")).resolves.toBe("trunk");
		const local = createGitService(async (_dir, args) => {
			if (args.includes("refs/remotes/origin/HEAD")) throw new Error("none");
			return "main\n";
		});
		await expect(local.defaultBranch("/r")).resolves.toBe("main");
	});
});
