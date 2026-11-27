import {
	type LogLevel,
	type LogRecord,
	type LogSource,
	logLevels,
	logSource,
} from "@yaa/contracts/log";

// What the debug panel shows: lines at or above a level, from one source or
// all, about the panel's worktree or any.
export type LogFilter = {
	level: LogLevel;
	source: LogSource | "all";
	worktree: "all" | "this";
};

export const initialFilter: LogFilter = {
	level: "info",
	source: "all",
	worktree: "all",
};

export const matches = (
	record: LogRecord,
	filter: LogFilter,
	worktree: string,
): boolean =>
	logLevels.indexOf(record.level) >= logLevels.indexOf(filter.level) &&
	(filter.source === "all" || record.source === filter.source) &&
	(filter.worktree === "all" || record.worktree === worktree);

export type FilterChoice<T> = { value: T; label: string };

export const levelChoices: readonly FilterChoice<LogLevel>[] = [
	{ value: "debug", label: "Debug and above" },
	{ value: "info", label: "Info and above" },
	{ value: "warn", label: "Warnings and errors" },
	{ value: "error", label: "Errors only" },
];

const sourceNames: Record<LogSource, string> = {
	main: "Main",
	core: "Core",
	"plugin-host": "Plugin host",
	agent: "Agent",
	workflow: "Workflow",
};

export const sourceChoices: readonly FilterChoice<LogSource | "all">[] = [
	{ value: "all", label: "All sources" },
	...logSource.options.map((source) => ({
		value: source,
		label: sourceNames[source],
	})),
];

export const worktreeChoices: readonly FilterChoice<"all" | "this">[] = [
	{ value: "all", label: "All worktrees" },
	{ value: "this", label: "This worktree" },
];

// The label of the value among the choices.
export const labelOf = <T>(
	choices: readonly FilterChoice<T>[],
	value: T,
): string => choices.find((choice) => choice.value === value)?.label ?? "";
