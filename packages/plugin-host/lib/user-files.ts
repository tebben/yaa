import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import type { PluginContext } from "@yaa/plugin-api";

const resolved = (path: string) => {
	const full =
		path === "~" || path.startsWith("~/")
			? join(homedir(), path.slice(1))
			: path;
	if (!isAbsolute(full)) throw new Error(`Not an absolute path: ${path}`);
	return full;
};

const missing = (error: unknown) =>
	error instanceof Error &&
	"code" in error &&
	(error.code === "ENOENT" || error.code === "ENOTDIR");

// A plugin's read-only way to files outside the worktrees, such as an
// agent's own configuration.
export const createUserFilesApi = (): PluginContext["userFiles"] => ({
	async read(path) {
		try {
			return await readFile(resolved(path), "utf8");
		} catch (error) {
			if (missing(error)) return undefined;
			throw error;
		}
	},
	async readDir(path) {
		try {
			const folder = resolved(path);
			const entries = await readdir(folder, { withFileTypes: true });
			// A link counts as what it points to, as skill folders often are.
			return Promise.all(
				entries.map(async (entry) => ({
					name: entry.name,
					folder: entry.isSymbolicLink()
						? await stat(join(folder, entry.name)).then(
								(target) => target.isDirectory(),
								() => false,
							)
						: entry.isDirectory(),
				})),
			);
		} catch (error) {
			if (missing(error)) return [];
			throw error;
		}
	},
});
