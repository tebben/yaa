import type { PanelAgents, SessionNews } from "@yaa/plugin-api/ui";
import { onDestroy } from "svelte";
import {
	appendEvents,
	EMPTY_TRANSCRIPT,
	type Transcript,
} from "./transcript.ts";

export type Session = {
	id: string;
	provider: string;
	transcript: Transcript;
};

// The worktree's sessions, oldest first. Events that arrive between two
// frames are applied together, so a streaming turn renders once a frame
// (docs/spec/12-stack-packaging.md). Call while the component sets up.
export const createSessions = (
	agents: PanelAgents,
	failed: (reason: unknown) => void,
) => {
	let sessions = $state.raw<ReadonlyMap<string, Session>>(new Map());
	// Whether the history is in.
	let read = $state(false);
	let waiting: SessionNews[] = [];
	let frame: number | undefined;

	const empty = (id: string, provider: string): Session => ({
		id,
		provider,
		transcript: EMPTY_TRANSCRIPT,
	});

	const apply = () => {
		frame = undefined;
		const next = new Map(sessions);
		for (const { sessionId, provider, events } of waiting) {
			const session = next.get(sessionId) ?? empty(sessionId, provider);
			next.set(sessionId, {
				...session,
				transcript: appendEvents(session.transcript, events),
			});
		}
		waiting = [];
		sessions = next;
		read = true;
	};

	agents.subscribe((news) => {
		waiting.push(...news);
		frame ??= requestAnimationFrame(apply);
	}, failed);
	onDestroy(() => {
		if (frame !== undefined) cancelAnimationFrame(frame);
	});

	return {
		get all(): Session[] {
			return [...sessions.values()];
		},
		get read() {
			return read;
		},
		get: (id: string) => sessions.get(id),
		// A session this panel started, which may have no event yet.
		started(id: string, provider: string) {
			if (!sessions.has(id)) {
				sessions = new Map(sessions).set(id, empty(id, provider));
			}
		},
	};
};
