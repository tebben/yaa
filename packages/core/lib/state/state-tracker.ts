import type { CoreEvent, coreEvent } from "@yaa/contracts/core-events";
import type { WorktreeState } from "@yaa/contracts/worktree-state";
import type { EventLog } from "../storage/event-log.ts";
import { reduceState, type StateSources, stateOf } from "./reduce-state.ts";

type States = Record<string, WorktreeState>;

export type StateTracker = {
	// Writes the event to the log and folds it into the states.
	append(event: CoreEvent): void;
	// Every worktree that is not idle.
	states(): States;
	// Called after an event changes a worktree's state.
	onChange(listener: () => void): void;
};

const derive = (sources: StateSources): States =>
	Object.fromEntries(
		[...sources].flatMap(([id, of]) => {
			const state = stateOf(of);
			return state === "idle" ? [] : [[id, state]];
		}),
	);

const same = (a: States, b: States) =>
	Object.keys(a).length === Object.keys(b).length &&
	Object.entries(a).every(([id, state]) => b[id] === state);

// The worktrees' states, derived from the whole event log and then from each
// event appended through here, so they are the same after a restart.
export const createStateTracker = (
	log: EventLog<typeof coreEvent>,
): StateTracker => {
	let sources: StateSources = new Map();
	let after = 0;
	for (let page = log.read(); page.length > 0; page = log.read({ after })) {
		for (const { seq, event } of page) {
			sources = reduceState(sources, event);
			after = seq;
		}
	}
	let states = derive(sources);
	const listeners = new Set<() => void>();

	return {
		append(event) {
			log.append(event);
			sources = reduceState(sources, event);
			const next = derive(sources);
			if (same(states, next)) return;
			states = next;
			for (const listener of listeners) listener();
		},
		states: () => states,
		onChange(listener) {
			listeners.add(listener);
		},
	};
};
