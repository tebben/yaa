import type { BranchStatus } from "@yaa/contracts/projects";

// Reads `git status --porcelain=v2 --branch`: the `# branch.` headers, then
// one line per changed, unmerged or untracked file.
export const parseStatus = (output: string): BranchStatus => {
	const status: BranchStatus = {
		branch: null,
		upstream: null,
		ahead: 0,
		behind: 0,
		changes: 0,
	};
	for (const line of output.split("\n")) {
		const header = /^# branch\.(\w+) (.*)$/.exec(line);
		if (header === null) {
			if (/^[12u?] /.test(line)) status.changes += 1;
			continue;
		}
		const [, name, value = ""] = header;
		if (name === "head") status.branch = value === "(detached)" ? null : value;
		if (name === "upstream") status.upstream = value;
		if (name === "ab") {
			const counts = /^\+(\d+) -(\d+)$/.exec(value);
			status.ahead = Number(counts?.[1] ?? 0);
			status.behind = Number(counts?.[2] ?? 0);
		}
	}
	return status;
};
