import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PluginFolder } from "./resolve-plugins.ts";

const isMissing = (error: unknown) =>
	error instanceof Error && "code" in error && error.code === "ENOENT";

const readManifest = (path: string): string | undefined => {
	try {
		return readFileSync(path, "utf8");
	} catch (error) {
		if (isMissing(error)) return undefined;
		throw error;
	}
};

// Every folder in `dir`, in name order, with its plugin.json. A missing
// `dir` holds no plugins.
export const readPluginFolders = (dir: string): PluginFolder[] => {
	let entries: string[];
	try {
		entries = readdirSync(dir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
	} catch (error) {
		if (isMissing(error)) return [];
		throw error;
	}
	return entries.map((folder) => ({
		folder,
		manifest: readManifest(join(dir, folder, "plugin.json")),
	}));
};
