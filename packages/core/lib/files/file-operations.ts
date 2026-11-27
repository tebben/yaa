import { createHash } from "node:crypto";
import {
	lstat,
	mkdir,
	readdir,
	readFile,
	realpath,
	rename,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import type {
	DirEntry,
	FileBytes,
	FileContent,
	FileWrite,
} from "@yaa/contracts/worktree-files";

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

// A file to read or write. Following a link must not leave the worktree.
const fileInside = async (root: string, path: string): Promise<string> => {
	const target = await inside(root, path);
	if (!(await exists(target))) return target;
	if (!(await lstat(target)).isSymbolicLink()) return target;
	const real = await realpath(root);
	// A link to nothing throws here: writing would make a file wherever it
	// points.
	const pointed = await realpath(target);
	if (!pointed.startsWith(real + sep)) {
		throw new Error(`${path} leads out of the worktree`);
	}
	// Checked as a path of its own, so a link cannot reach into `.git`.
	return inside(real, relative(real, pointed).split(sep).join("/"));
};

// Larger files are not opened as text.
const MAX_TEXT_BYTES = 10 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const versionOf = (bytes: Uint8Array) =>
	createHash("sha256").update(bytes).digest("hex");

// The file's bytes, or null when it is not there.
const bytesOf = (path: string) =>
	readFile(path).catch((error: unknown) => {
		if (isCode(error, "ENOENT")) return null;
		throw error;
	});

// A byte order mark stays in the text, so writing it back keeps it.
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

const decode = (bytes: Uint8Array): string | undefined => {
	if (bytes.includes(0)) return undefined;
	try {
		return utf8.decode(bytes);
	} catch {
		return undefined;
	}
};

export const readBytes = async (
	root: string,
	path: string,
): Promise<FileBytes> => {
	const target = await fileInside(root, path);
	if (!(await exists(target))) return { kind: "missing" };
	const found = await stat(target);
	if (!found.isFile()) throw new Error(`${path} is not a file`);
	if (found.size > MAX_FILE_BYTES) return { kind: "tooLarge" };
	const bytes = await bytesOf(target);
	if (bytes === null) return { kind: "missing" };
	if (bytes.length > MAX_FILE_BYTES) return { kind: "tooLarge" };
	return { kind: "bytes", data: bytes.toString("base64") };
};

export const readText = async (
	root: string,
	path: string,
): Promise<FileContent> => {
	const target = await fileInside(root, path);
	if (!(await exists(target))) return { kind: "missing" };
	const found = await stat(target);
	// Reading a pipe or a device would never end.
	if (!found.isFile()) throw new Error(`${path} is not a file`);
	if (found.size > MAX_TEXT_BYTES) return { kind: "tooLarge" };
	const bytes = await bytesOf(target);
	if (bytes === null) return { kind: "missing" };
	const text = decode(bytes);
	return text === undefined
		? { kind: "binary" }
		: { kind: "text", text, version: versionOf(bytes) };
};

// Writes over the file at `version`, or makes it when `version` is null and
// it is not there. The file keeps its mode, and a link stays a link.
export const writeText = async (
	root: string,
	path: string,
	text: string,
	version: string | null,
): Promise<FileWrite> => {
	const target = await fileInside(root, path);
	const current = await bytesOf(target);
	const found = current === null ? null : versionOf(current);
	if (found !== version) return { kind: "changed", version: found };
	const bytes = Buffer.from(text, "utf8");
	if (current === null) await mkdir(dirname(target), { recursive: true });
	await writeFile(target, bytes, { flag: current === null ? "wx" : "w" });
	return { kind: "written", version: versionOf(bytes) };
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
