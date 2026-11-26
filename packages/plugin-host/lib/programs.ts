import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { delimiter, isAbsolute, join } from "node:path";
import type { PluginContext } from "@yaa/plugin-api";

const TIMEOUT_MS = 10_000;

const runnable = async (path: string) => {
	try {
		await access(path, constants.X_OK);
		return (await stat(path)).isFile();
	} catch {
		// Not there, or not this user's to run.
		return false;
	}
};

// A plugin's way to the programs installed on the machine.
export const createProgramsApi = (): PluginContext["programs"] => ({
	async find(name) {
		const folders = (process.env["PATH"] ?? "").split(delimiter);
		// A relative entry would name a different program in each folder.
		for (const folder of folders.filter((entry) => isAbsolute(entry))) {
			const path = join(folder, name);
			if (await runnable(path)) return path;
		}
		return undefined;
	},
	run: (path, args) =>
		new Promise((resolve, reject) => {
			const child = execFile(
				path,
				args,
				{ timeout: TIMEOUT_MS },
				(error, stdout, stderr) => {
					if (error === null) resolve({ code: 0, stdout, stderr });
					else if (typeof error.code === "number") {
						resolve({ code: error.code, stdout, stderr });
					} else reject(error);
				},
			);
			child.stdin?.end();
		}),
});
