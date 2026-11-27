import { fuzzyMatch } from "@yaa/commands/fuzzy-match";
import type { LogRecord } from "@yaa/contracts/log";
import type { PanelContext } from "@yaa/plugin-api/ui";
import { onDestroy } from "svelte";
import {
	type FilterChoice,
	initialFilter,
	type LogFilter,
	labelOf,
	levelChoices,
	matches,
	sourceChoices,
	worktreeChoices,
} from "../log-filter.ts";

// As many as core keeps, so the panel never holds more than it would send.
const KEEP = 10_000;

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The debug panel: the app's log, filtered by level, source and worktree.
// Lines that arrive between two frames are added together. Call while the
// component sets up.
export const createDebugPanel = (panel: PanelContext) => {
	let records = $state.raw<readonly LogRecord[]>([]);
	let filter = $state.raw<LogFilter>(initialFilter);
	let failure = $state<string>();
	let waiting: LogRecord[] = [];
	let frame: number | undefined;

	const apply = () => {
		frame = undefined;
		records = [...records, ...waiting].slice(-KEEP);
		waiting = [];
	};
	panel.logs.subscribe(
		(added) => {
			waiting.push(...added);
			frame ??= requestAnimationFrame(apply);
		},
		(reason) => {
			failure = `The logs could not be read: ${describe(reason)}`;
		},
	);
	onDestroy(() => {
		if (frame !== undefined) cancelAnimationFrame(frame);
	});

	const shown = $derived(
		records.filter((record) => matches(record, filter, panel.worktree.id)),
	);

	const pick = <K extends keyof LogFilter>(
		key: K,
		label: string,
		choices: readonly FilterChoice<LogFilter[K]>[],
	) =>
		panel.pick({
			label,
			placeholder: label,
			items: (query) =>
				fuzzyMatch(query, choices, ({ label }) => label).map((choice) => ({
					id: String(choice.value),
					label: choice.label,
					...(choice.value === filter[key] ? { detail: "current" } : {}),
				})),
			empty: () => "No such filter",
			accept(item) {
				const chosen = choices.find(({ value }) => String(value) === item.id);
				if (chosen !== undefined) filter = { ...filter, [key]: chosen.value };
			},
		});

	const pickers = {
		level: () => pick("level", "Level", levelChoices),
		source: () => pick("source", "Source", sourceChoices),
		worktree: () => pick("worktree", "Worktree", worktreeChoices),
	};
	panel.commands.register("debug.level", pickers.level);
	panel.commands.register("debug.source", pickers.source);
	panel.commands.register("debug.worktree", pickers.worktree);

	return {
		get shown() {
			return shown;
		},
		get failure() {
			return failure;
		},
		get labels() {
			return {
				level: labelOf(levelChoices, filter.level),
				source: labelOf(sourceChoices, filter.source),
				worktree: labelOf(worktreeChoices, filter.worktree),
			};
		},
		pickers,
	};
};

export type DebugPanel = ReturnType<typeof createDebugPanel>;
