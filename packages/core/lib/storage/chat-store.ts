import type { DatabaseSync } from "node:sqlite";
import { type AgentEvent, agentEvent } from "@yaa/contracts/agent-events";
import * as z from "zod";

export type StoredChat = {
	id: string;
	worktree: string;
	provider: string;
	// The agent's own id for the session, which resuming it takes.
	agentSession: string;
	events: AgentEvent[];
};

// Chats and their events, which go with their worktree
// (docs/spec/11-platform-services.md). Each event is checked on its way out,
// as the event log's are.
export type ChatStore = {
	// Every chat, oldest first, with its events in order.
	all(): StoredChat[];
	add(chat: Omit<StoredChat, "events">): void;
	// The event numbered `seq`, which is how many the chat had before it.
	append(chat: string, seq: number, event: AgentEvent): void;
};

const chatRow = z.object({
	id: z.string(),
	worktree_id: z.string(),
	provider: z.string(),
	agent_session: z.string(),
});
const eventRow = z.object({ chat_id: z.string(), event: z.string() });

export const createChatStore = (
	db: DatabaseSync,
	now: () => number = Date.now,
): ChatStore => {
	const selectChats = db.prepare(
		"SELECT id, worktree_id, provider, agent_session FROM chats ORDER BY created_at, rowid",
	);
	const selectEvents = db.prepare(
		"SELECT chat_id, event FROM chat_events ORDER BY chat_id, seq",
	);
	const insertChat = db.prepare(
		"INSERT INTO chats (id, worktree_id, provider, agent_session, created_at) VALUES (?, ?, ?, ?, ?)",
	);
	const insertEvent = db.prepare(
		"INSERT INTO chat_events (chat_id, seq, event) VALUES (?, ?, ?)",
	);
	return {
		all() {
			const events = new Map<string, AgentEvent[]>();
			for (const raw of selectEvents.all()) {
				const row = eventRow.parse(raw);
				const event = agentEvent.parse(JSON.parse(row.event));
				const list = events.get(row.chat_id);
				if (list === undefined) events.set(row.chat_id, [event]);
				else list.push(event);
			}
			return selectChats.all().map((raw) => {
				const row = chatRow.parse(raw);
				return {
					id: row.id,
					worktree: row.worktree_id,
					provider: row.provider,
					agentSession: row.agent_session,
					events: events.get(row.id) ?? [],
				};
			});
		},
		add({ id, worktree, provider, agentSession }) {
			insertChat.run(id, worktree, provider, agentSession, now());
		},
		append(chat, seq, event) {
			insertEvent.run(chat, seq, JSON.stringify(agentEvent.parse(event)));
		},
	};
};
