import type { FileProblem } from "@yaa/contracts/file-problem";
import type * as z from "zod";

// Zod issues as file problems, with their paths under `at`.
export const issueProblems = (
	at: (string | number)[],
	error: z.ZodError,
): FileProblem[] =>
	error.issues.map((issue) => ({
		path: [...at, ...issue.path.filter((part) => typeof part !== "symbol")],
		message: issue.message,
	}));
