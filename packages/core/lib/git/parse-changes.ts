import type { GitChange, GitChangeKind } from "@yaa/contracts/worktree-files";

const kinds: Record<string, GitChangeKind> = {
	M: "modified",
	A: "added",
	D: "deleted",
	R: "renamed",
	C: "copied",
	T: "typeChanged",
};

// The fields before the path in each kind of porcelain v2 entry.
const FIELDS: Record<string, number> = { "1": 8, "2": 9, u: 10 };

// Reads `git status --porcelain=v2 -z`: entries end with NUL, and a renamed
// or copied one is followed by the path it came from.
export const parseChanges = (output: string): GitChange[] => {
	const changes: GitChange[] = [];
	const entries = output.split("\0");
	for (let at = 0; at < entries.length; at += 1) {
		const entry = entries[at] ?? "";
		const type = entry.charAt(0);
		if (type === "?") {
			changes.push({
				path: entry.slice(2),
				staged: null,
				unstaged: "untracked",
			});
			continue;
		}
		const fields = FIELDS[type];
		if (fields === undefined) continue;
		const parts = entry.split(" ");
		const [, codes = ""] = parts;
		const path = parts.slice(fields).join(" ");
		const originalPath = type === "2" ? entries[++at] : undefined;
		changes.push(
			type === "u"
				? { path, staged: null, unstaged: "unmerged" }
				: {
						path,
						...(originalPath === undefined ? {} : { originalPath }),
						staged: kinds[codes.charAt(0)] ?? null,
						unstaged: kinds[codes.charAt(1)] ?? null,
					},
		);
	}
	return changes;
};
