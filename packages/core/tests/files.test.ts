import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createFile,
	fetchImage,
	readBytes,
	readFolder,
	readText,
	removePath,
	renamePath,
	type TreeWatcher,
	watchTree,
	writeText,
} from "../files.ts";
import { parseChanges, parseFiles } from "../git.ts";

let dir = "";
let root = "";

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "yaa-files-"));
	root = join(dir, "worktree");
	await mkdir(root);
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("parseChanges", () => {
	it("reads staged, unstaged, renamed, conflicted and untracked entries", () => {
		const hashes = "N... 100644 100644 100644 abc abc";
		const output = [
			`1 M. ${hashes} staged.ts`,
			`1 AM ${hashes} with space.ts`,
			`2 R. ${hashes} R100 new.ts`,
			"old.ts",
			"u UU N... 100644 100644 100644 100644 abc abc abc both.ts",
			"? loose.ts",
			"",
		].join("\0");
		expect(parseChanges(output)).toEqual([
			{ path: "staged.ts", staged: "modified", unstaged: null },
			{ path: "with space.ts", staged: "added", unstaged: "modified" },
			{
				path: "new.ts",
				originalPath: "old.ts",
				staged: "renamed",
				unstaged: null,
			},
			{ path: "both.ts", staged: null, unstaged: "unmerged" },
			{ path: "loose.ts", staged: null, unstaged: "untracked" },
		]);
	});
});

describe("parseFiles", () => {
	it("lists each file once, and submodules and nested repositories as folders", () => {
		const tracked = [
			"100644 abc 1\ta.ts",
			"100644 abd 2\ta.ts",
			"160000 abe 0\tvendor/lib",
			"",
		].join("\0");
		expect(parseFiles(tracked, "new.ts\0nested/\0")).toEqual({
			files: ["a.ts", "new.ts"],
			folders: ["vendor/lib", "nested"],
		});
	});
});

describe("worktree file operations", () => {
	it("creates, renames and removes, making the folders a path needs", async () => {
		await createFile(root, "src/a.ts");
		await renamePath(root, "src/a.ts", "lib/b.ts");
		expect(await readFolder(root, "lib")).toEqual([
			{ name: "b.ts", folder: false },
		]);
		await removePath(root, "lib");
		expect(await readFolder(root, "")).toEqual([{ name: "src", folder: true }]);
	});

	it("never writes over a file", async () => {
		await writeFile(join(root, "a"), "a");
		await writeFile(join(root, "b"), "b");
		await expect(createFile(root, "a")).rejects.toThrow("exists already");
		await expect(renamePath(root, "a", "b")).rejects.toThrow("exists already");
		expect(await readFile(join(root, "b"), "utf8")).toBe("b");
	});

	it("refuses paths that leave the worktree or touch .git", async () => {
		await mkdir(join(dir, "outside"));
		await writeFile(join(dir, "outside", "kept"), "");
		await symlink(join(dir, "outside"), join(root, "link"));
		for (const path of ["", "../outside/kept", "/etc", "a//b", ".GIT/config"]) {
			await expect(removePath(root, path)).rejects.toThrow("Not a path");
		}
		await expect(removePath(root, "link/kept")).rejects.toThrow("leads out");
		await expect(createFile(root, "link/new/file")).rejects.toThrow(
			"leads out",
		);
		await expect(readFolder(root, "link")).rejects.toThrow("is a link");
		// The link itself is the worktree's to remove.
		await removePath(root, "link");
		expect(await readFile(join(dir, "outside", "kept"), "utf8")).toBe("");
	});
});

describe("reading and writing text", () => {
	it("reads binary files only within the worktree", async () => {
		await writeFile(join(root, "image"), Buffer.from([0, 1, 255]));
		await writeFile(join(dir, "outside"), "private");
		await symlink(join(dir, "outside"), join(root, "link"));
		expect(await readBytes(root, "image")).toEqual({
			kind: "bytes",
			data: "AAH/",
		});
		expect(await readBytes(root, "missing")).toEqual({ kind: "missing" });
		await expect(readBytes(root, "link")).rejects.toThrow("leads out");
	});

	describe("remote images", () => {
		afterEach(() => vi.unstubAllGlobals());

		it("returns the bytes of a supported image", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue(
					new Response(Uint8Array.from([0, 1, 255]), {
						headers: { "content-type": "image/png" },
					}),
				),
			);
			expect(await fetchImage("https://example.test/a")).toEqual({
				data: "AAH/",
				mime: "image/png",
			});
		});

		it("requires HTTPS and validates the response type", async () => {
			const request = vi.fn().mockResolvedValue(
				new Response("not an image", {
					headers: { "content-type": "text/html" },
				}),
			);
			vi.stubGlobal("fetch", request);
			await expect(fetchImage("http://example.test/a")).rejects.toThrow(
				"HTTPS",
			);
			expect(request).not.toHaveBeenCalled();
			await expect(fetchImage("https://example.test/a")).rejects.toThrow(
				"not a supported image",
			);
		});

		it("does not follow a redirect to HTTP", async () => {
			const request = vi.fn().mockResolvedValue(
				new Response(null, {
					status: 302,
					headers: { location: "http://example.test/image.png" },
				}),
			);
			vi.stubGlobal("fetch", request);
			await expect(fetchImage("https://example.test/a")).rejects.toThrow(
				"HTTPS",
			);
			expect(request).toHaveBeenCalledTimes(1);
		});

		it("stops a response larger than the image limit", async () => {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue(
					new Response(new Uint8Array(10 * 1024 * 1024 + 1), {
						headers: { "content-type": "image/png" },
					}),
				),
			);
			await expect(fetchImage("https://example.test/a")).rejects.toThrow(
				"too large",
			);
		});
	});

	it("writes only over the version that was read, keeping a byte order mark", async () => {
		await writeFile(join(root, "a"), "\uFEFFone");
		const read = await readText(root, "a");
		if (read.kind !== "text") throw new Error(read.kind);
		expect(read.text).toBe("\uFEFFone");
		const written = await writeText(root, "a", "\uFEFFtwo", read.version);
		expect(written.kind).toBe("written");
		expect(await writeText(root, "a", "three", read.version)).toEqual({
			kind: "changed",
			version: written.version,
		});
		expect(await readFile(join(root, "a"), "utf8")).toBe("\uFEFFtwo");
	});

	it("makes a file only when none is expected, and says when one is gone", async () => {
		expect(await readText(root, "new/a")).toEqual({ kind: "missing" });
		expect(await writeText(root, "new/a", "x", "old")).toEqual({
			kind: "changed",
			version: null,
		});
		expect((await writeText(root, "new/a", "x", null)).kind).toBe("written");
		expect((await writeText(root, "new/a", "y", null)).kind).toBe("changed");
	});

	it("reads nothing but UTF-8 text", async () => {
		await writeFile(join(root, "zero"), Buffer.from([97, 0, 98]));
		await writeFile(join(root, "latin1"), Buffer.from([0xe9]));
		expect(await readText(root, "zero")).toEqual({ kind: "binary" });
		expect(await readText(root, "latin1")).toEqual({ kind: "binary" });
	});

	it("follows a link inside the worktree only, and never into .git", async () => {
		await writeFile(join(dir, "outside"), "kept");
		await mkdir(join(root, ".git"));
		await writeFile(join(root, ".git", "config"), "kept");
		await writeFile(join(root, "real"), "a");
		await symlink("real", join(root, "inner"));
		await symlink(join(dir, "outside"), join(root, "out"));
		await symlink(".git/config", join(root, "config"));
		const read = await readText(root, "inner");
		if (read.kind !== "text") throw new Error(read.kind);
		await writeText(root, "inner", "b", read.version);
		expect(await readFile(join(root, "real"), "utf8")).toBe("b");
		await expect(readText(root, "out")).rejects.toThrow("leads out");
		await expect(writeText(root, "config", "x", null)).rejects.toThrow(
			"Not a path",
		);
	});
});

describe("watchTree", () => {
	it("sees changes in folders made after it started, and in the index", async () => {
		const gitDir = join(dir, "git");
		await mkdir(gitDir);
		let seen = () => {};
		const next = () =>
			new Promise<void>((resolve) => {
				seen = resolve;
			});
		let watcher: TreeWatcher | undefined;
		try {
			watcher = await watchTree({
				root,
				gitDir,
				ignored: async () => [],
				onChange: () => seen(),
				onError: (error) => {
					throw error;
				},
			});
			let change = next();
			await mkdir(join(root, "new", "deeper"), { recursive: true });
			await change;
			change = next();
			await writeFile(join(root, "new", "deeper", "file"), "");
			await change;
			change = next();
			await writeFile(join(gitDir, "index"), "");
			await change;
		} finally {
			watcher?.close();
		}
	});
});
