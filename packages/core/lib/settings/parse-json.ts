import type { FileProblem } from "@yaa/contracts/file-problem";

export type ParsedJson =
	| { kind: "empty" }
	| { kind: "json"; data: unknown }
	| { kind: "invalid"; problem: FileProblem };

// A missing or blank file is empty, so a new file means the defaults.
export const parseJson = (text: string | undefined): ParsedJson => {
	if (text === undefined || text.trim() === "") return { kind: "empty" };
	try {
		return { kind: "json", data: JSON.parse(text) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { kind: "invalid", problem: { path: [], message } };
	}
};
