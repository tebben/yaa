import { structuredPatch } from "diff";

// Unchanged lines kept around each change.
const CONTEXT = 3;

export type DiffLine = {
	// `gap` stands for unchanged lines left out between two changes.
	kind: "added" | "removed" | "context" | "gap";
	text: string;
};

const kinds = { "+": "added", "-": "removed", " ": "context" } as const;
const isMark = (mark: string): mark is keyof typeof kinds =>
	Object.hasOwn(kinds, mark);

// The lines of a file edit as an inline diff shows them; without an old text
// every line is added.
export const changeLines = (
	oldText: string | undefined,
	newText: string,
): DiffLine[] =>
	structuredPatch("", "", oldText ?? "", newText, "", "", {
		context: CONTEXT,
	}).hunks.flatMap((hunk, index) => [
		...(index === 0 ? [] : [{ kind: "gap" as const, text: "⋯" }]),
		...hunk.lines.flatMap((line) => {
			const mark = line.charAt(0);
			// The patch also notes a missing newline at the end, which is not a
			// line of the file.
			return isMark(mark) ? [{ kind: kinds[mark], text: line.slice(1) }] : [];
		}),
	]);
