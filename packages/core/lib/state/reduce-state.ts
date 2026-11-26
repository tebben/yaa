import type { CoreEvent } from "@yaa/contracts/core-events";
import {
	type WorktreeState,
	worktreeState,
} from "@yaa/contracts/worktree-state";

type Chat = {
	turn: "idle" | "running" | "error";
	// The permission requests and questions waiting for the user.
	requests: ReadonlySet<string>;
};

// What a worktree's state comes from: each chat, its setup or teardown
// steps, and the user's done mark.
export type Sources = {
	chats: ReadonlyMap<string, Chat>;
	steps: "idle" | "running" | "error";
	done: boolean;
};

export type StateSources = ReadonlyMap<string, Sources>;

type WorktreeEvent = Exclude<CoreEvent, { type: "core.started" }>;

const noSources: Sources = { chats: new Map(), steps: "idle", done: false };

const chatIn = (turn: Chat["turn"]): Chat => ({ turn, requests: new Set() });

const chatState = ({ turn, requests }: Chat): WorktreeState =>
	requests.size > 0 ? "attention" : turn;

export const highestState = (states: readonly WorktreeState[]): WorktreeState =>
	worktreeState.options.find((state) => states.includes(state)) ?? "idle";

export const stateOf = ({ chats, steps, done }: Sources): WorktreeState =>
	highestState([
		...[...chats.values()].map(chatState),
		steps,
		done ? "done" : "idle",
	]);

const withChat = (
	sources: Sources,
	id: string,
	update: (chat: Chat) => Chat,
): Sources => ({
	...sources,
	chats: new Map(sources.chats).set(
		id,
		update(sources.chats.get(id) ?? chatIn("idle")),
	),
});

const withRequests = (
	sources: Sources,
	id: string,
	change: (requests: Set<string>) => void,
) =>
	withChat(sources, id, ({ turn, requests }) => {
		const next = new Set(requests);
		change(next);
		return { turn, requests: next };
	});

const reduceWorktree = (sources: Sources, event: WorktreeEvent): Sources => {
	switch (event.type) {
		case "worktree.steps.started":
			return { ...sources, steps: "running", done: false };
		case "worktree.steps.succeeded":
			return { ...sources, steps: "idle" };
		case "worktree.steps.failed":
			return { ...sources, steps: "error" };
		case "chat.turn.started": {
			// New work takes the done mark off and moves on from failed steps.
			const steps = sources.steps === "error" ? "idle" : sources.steps;
			return withChat({ ...sources, steps, done: false }, event.chat, () =>
				chatIn("running"),
			);
		}
		case "chat.turn.ended":
			return withChat(sources, event.chat, () => chatIn("idle"));
		case "chat.turn.failed":
			return withChat(sources, event.chat, () => chatIn("error"));
		case "chat.request.opened":
			return withRequests(sources, event.chat, (requests) =>
				requests.add(event.requestId),
			);
		case "chat.request.resolved":
			return withRequests(sources, event.chat, (requests) =>
				requests.delete(event.requestId),
			);
		case "worktree.done.set":
			return { ...sources, done: event.done };
	}
};

// A core that starts has no turn or step under way: a turn cut off by the
// last one's exit is over, and steps it did not see end have failed.
const restarted = ({ chats, steps, done }: Sources): Sources => ({
	chats: new Map(
		[...chats].map(([id, { turn }]) => [
			id,
			chatIn(turn === "error" ? "error" : "idle"),
		]),
	),
	steps: steps === "running" ? "error" : steps,
	done,
});

// Every worktree's state sources after one more event
// (docs/spec/02-worktrees.md).
export const reduceState = (
	worktrees: StateSources,
	event: CoreEvent,
): StateSources => {
	if (event.type === "core.started") {
		return new Map(
			[...worktrees].map(([id, sources]) => [id, restarted(sources)]),
		);
	}
	return new Map(worktrees).set(
		event.worktree,
		reduceWorktree(worktrees.get(event.worktree) ?? noSources, event),
	);
};
