import type { ContextLayer } from "@yaa/contracts/agent-context";
import type { Row } from "./rows.ts";

const FROM: Record<ContextLayer, string> = {
	worktree: "set in this worktree",
	project: "set for the project",
	app: "set globally",
};

// What a row says under its name: where it is from, and why its switch is as
// it is.
export const rowNotes = (row: Row): string[] => [
	row.levels.join(" and "),
	row.providers.join(", "),
	...(row.unavailable ? ["off in the agent's own configuration"] : []),
	...(row.from === undefined || !row.switchable ? [] : [FROM[row.from]]),
	...(row.overriddenBy === undefined || !row.switchable
		? []
		: [`overruled: ${FROM[row.overriddenBy]}`]),
	...(row.unavailable || row.keptBy.length === 0
		? []
		: [`${row.keptBy.join(", ")} cannot switch it off`]),
];
