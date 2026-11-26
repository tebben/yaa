import {
	lstat,
	mkdir,
	readdir,
	realpath,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { dirname, join, sep } from "node:path";
import type { DirEntry } from "@yaa/contracts/worktree-files";

const isCode = (error: unknown, code: string) =>
	error instanceof Error && "code" in error && error.code === code;

const exists = (path: string) =>
	lstat(path).then(
		() => true,
		(error: unknown) => {
			if (isCode(error, "ENOENT")) return false;
			throw error;
		},
	);

// The real folder of `path`, or of the nearest folder above it that exists.
const nearestReal = async (path: string): Promise<string> => {
	try {
		return await realpath(path);
	} catch (error) {
		if (!isCode(error, "ENOENT")) throw error;
		return nearestReal(dirname(path));
	}
};

const REFUSED: ReadonlySet<string> = new Set(["", ".", "..", ".git"]);

// The absolute path of a path inside the worktree at `root`. Refused: one
// that is not made of plain names, one in `.git`, and one whose folder a
// link leads out of the worktree. The last name may itself be a link, which
// is then what the caller moves or removes.
const inside = async (root: string, path: string): Promise<string> => {
	const names = path.split("/");
	if (names.some((name) => REFUSED.has(name.toLowerCase()))) {
		throw new Error(`Not a path in the worktree: ${path}`);
	}
	const target = join(root, ...names);
	const real = await realpath(root);
	const parent = await nearestReal(dirname(target));
	if (parent !== real && !parent.startsWith(real + sep)) {
		throw new Error(`${path} leads out of the worktree`);
	}
	return target;
};

export const readFolder = async (
	root: string,
	path: string,
): Promise<DirEntry[]> => {
	let folder = root;
	if (path !== "") {
		folder = await inside(root, path);
		// A link may lead anywhere; reading it would follow it.
		if ((await lstat(folder)).isSymbolicLink()) {
			throw new Error(`${path} is a link, not a folder`);
		}
	}
	const entries = await readdir(folder, { withFileTypes: true });
	return entries
		.filter(({ name }) => name !== ".git")
		.map((entry) => ({ name: entry.name, folder: entry.isDirectory() }));
};

export const createFile = async (root: string, path: string): Promise<void> => {
	const target = await inside(root, path);
	if (await exists(target)) throw new Error(`${path} exists already`);
	await mkdir(dirname(target), { recursive: true });
	await writeFile(target, "", { flag: "wx" });
};

export const renamePath = async (
	root: string,
	from: string,
	to: string,
): Promise<void> => {
	const source = await inside(root, from);
	const target = await inside(root, to);
	// rename would replace a file that is there.
	if (await exists(target)) throw new Error(`${to} exists already`);
	await mkdir(dirname(target), { recursive: true });
	await rename(source, target);
};

export const removePath = async (root: string, path: string): Promise<void> => {
	await rm(await inside(root, path), { recursive: true });
};
