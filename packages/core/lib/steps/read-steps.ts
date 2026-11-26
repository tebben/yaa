import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type WorktreeSteps,
	worktreeSteps,
	worktreeStepsPath,
} from "@yaa/contracts/worktree-steps";
import { issueProblems } from "../settings/issue-problems.ts";
import { parseJson } from "../settings/parse-json.ts";

export type ReadSteps = (checkout: string) => Promise<WorktreeSteps>;

const readText = (path: string) =>
	readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
		if (error.code === "ENOENT") return undefined;
		throw error;
	});

// The project's steps; none without the file. A file with any mistake throws
// what is wrong, so that no command of a half-understood file runs.
export const readSteps: ReadSteps = async (checkout) => {
	const parsed = parseJson(await readText(join(checkout, worktreeStepsPath)));
	if (parsed.kind === "invalid") throw new Error(parsed.problem.message);
	const result = worktreeSteps.safeParse(
		parsed.kind === "json" ? parsed.data : {},
	);
	if (result.success) return result.data;
	throw new Error(
		issueProblems([], result.error)
			.map(({ path, message }) =>
				path.length === 0 ? message : `${path.join(".")}: ${message}`,
			)
			.join("; "),
	);
};
