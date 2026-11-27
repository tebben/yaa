import { randomUUID } from "node:crypto";
import type {
	AgentEvent,
	PromptAttachment,
	QuestionAnswer,
	SessionEvent,
} from "@yaa/contracts/agent-events";
import type { CoreEvent } from "@yaa/contracts/core-events";
import type { Logger } from "@yaa/contracts/log";
import {
	applyPermissionMode,
	type PermissionModeMapping,
} from "@yaa/contracts/permission-modes";
import type { Worktree } from "@yaa/contracts/projects";
import { chatEvent } from "../state/chat-event.ts";
import type { ChatStore } from "../storage/chat-store.ts";
import { type AcpSession, openAcpSession } from "./acp-session.ts";
import type { AgentLaunch } from "./agent-launch.ts";
import { type AgentProcess, startAgentProcess } from "./agent-process.ts";
import { workUnderWay } from "./work-under-way.ts";

export type AgentSessionsOptions = {
	// How to start a provider's agent in a folder, from its plugin.
	launch(provider: string, cwd: string): Promise<AgentLaunch>;
	// How the provider applies permission modes, if it does.
	permissionModes(provider: string): PermissionModeMapping | undefined;
	// A listed worktree, where its agents start; throws for one that is gone.
	worktree(id: string): Pick<Worktree, "path" | "index" | "permissionMode">;
	store: ChatStore;
	// Logs the events the worktree's state is derived from.
	record(event: CoreEvent): void;
	log: Logger;
	// For the lines agents write to stderr.
	agentLog: Logger;
	emit(event: SessionEvent): void;
};

// The agent a chat runs on, once it is started: `acp` is there once its
// session is open.
type Connection = { ready: Promise<AcpSession>; acp?: AcpSession };

type Chat = {
	worktree: string;
	provider: string;
	// The agent's id for the session, set once it first opened.
	agentSession: string;
	events: AgentEvent[];
	// Undefined while no agent runs for it: after a restart, or once its
	// agent has exited.
	connection?: Connection;
};

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

// The chats core holds, each with every event it has sent, so a client that
// connects later reads the history (the renderer keeps no business state,
// see docs/spec/00-overview.md). Chats and their events are stored, so they
// come back after a restart without their agents, which start again when a
// chat next needs one and resume its session
// (docs/spec/11-platform-services.md).
export const createAgentSessions = ({
	launch,
	permissionModes,
	worktree: listed,
	store,
	record,
	log,
	agentLog,
	emit,
}: AgentSessionsOptions) => {
	const chats = new Map<string, Chat>();
	// The worktree of every agent still wanted, those of sessions being opened
	// included.
	const agents = new Map<AgentProcess, string>();

	// Sends and logs the chat's next event; `stored` is false for a new chat
	// whose session is still opening, which is stored once it opens.
	const push = (id: string, chat: Chat, event: AgentEvent, stored = true) => {
		const seq = chat.events.length;
		chat.events.push(event);
		if (stored) store.append(id, seq, event);
		const logged = chatEvent({ worktree: chat.worktree, chat: id }, event);
		if (logged !== undefined) record(logged);
		emit({
			sessionId: id,
			worktree: chat.worktree,
			provider: chat.provider,
			seq,
			event,
		});
	};

	// What yaa was doing in a chat when it last closed is over. No client is
	// connected yet, and the event log's restart says the same for the
	// worktree's state (docs/decisions/0028-worktree-state-sources.md).
	for (const { id, events, ...rest } of store.all()) {
		if (workUnderWay(events)) {
			store.append(id, events.length, { type: "interrupted" });
			events.push({ type: "interrupted" });
		}
		chats.set(id, { ...rest, events });
	}

	const found = (id: string): Chat => {
		const chat = chats.get(id);
		if (chat === undefined) throw new Error(`No session ${id}`);
		return chat;
	};

	const stop = (agent: AgentProcess) => {
		agents.delete(agent);
		agent.stop();
	};

	// Puts the chat's agent in its worktree's permission mode, by the options
	// it reported last (docs/spec/11-platform-services.md).
	const applyMode = async (chat: Chat, acp: AcpSession) => {
		const mapping = permissionModes(chat.provider);
		if (mapping === undefined) return;
		const mode = listed(chat.worktree).permissionMode;
		const options =
			chat.events.findLast((event) => event.type === "config")?.options ?? [];
		const applied = applyPermissionMode(mapping, mode, options);
		if (applied.action === "set") {
			await acp.setConfig(mapping.option, applied.value);
		} else if (applied.action === "missing") {
			log
				.forWorktree(chat.worktree)
				.warn("the agent offers no value for the permission mode", {
					provider: chat.provider,
					mode,
				});
		}
	};

	// Starts the chat's agent in its worktree and opens a session on it, or
	// resumes the agent's session `resume`, in the worktree's permission mode.
	const open = async (
		chat: Chat,
		emitEvent: (event: AgentEvent) => void,
		resume?: string,
	) => {
		const { worktree, provider } = chat;
		const how = await launch(provider, listed(worktree).path);
		// Read again: the worktree may have been finished meanwhile.
		const { path, index } = listed(worktree);
		const agent = startAgentProcess({
			launch: {
				...how,
				env: { ...how.env, YAA_WORKTREE_INDEX: String(index) },
			},
			cwd: path,
			log: agentLog.forWorktree(worktree),
		});
		agents.set(agent, worktree);
		try {
			const acp = await openAcpSession({
				agent,
				cwd: path,
				...(resume === undefined ? {} : { resume }),
				log: log.forWorktree(worktree),
				emit: emitEvent,
			});
			if (!agents.has(agent)) {
				acp.close();
				throw new Error("The worktree was closed while its agent started");
			}
			await applyMode(chat, acp).catch((error: unknown) => {
				acp.close();
				throw error;
			});
			return { acp, agent };
		} catch (error) {
			stop(agent);
			throw error;
		}
	};

	// The chat's connection is the one `ready` belongs to until its agent
	// exits, so the next need starts the agent again.
	const connect = (
		chat: Chat,
		ready: Promise<{ acp: AcpSession; agent: AgentProcess }>,
	) => {
		const connection: Connection = {
			ready: ready.then(({ acp, agent }) => {
				connection.acp = acp;
				void agent.exited.then(() => {
					if (chat.connection === connection) delete chat.connection;
				});
				return acp;
			}),
		};
		chat.connection = connection;
		connection.ready.catch(() => {
			if (chat.connection === connection) delete chat.connection;
		});
		return connection.ready;
	};

	// The chat's open session, resuming it first when no agent runs for it.
	const session = (id: string): Promise<AcpSession> => {
		const chat = found(id);
		if (chat.connection !== undefined) return chat.connection.ready;
		push(id, chat, { type: "resuming" });
		const ready = open(
			chat,
			(event) => push(id, chat, event),
			chat.agentSession,
		);
		return connect(chat, ready).then(
			(acp) => {
				log
					.forWorktree(chat.worktree)
					.info("agent session resumed", { sessionId: id });
				return acp;
			},
			(error: unknown) => {
				// A chat forgotten meanwhile, with its worktree, keeps no events.
				if (chats.get(id) === chat) {
					push(id, chat, { type: "error", message: describe(error) });
				}
				throw error;
			},
		);
	};

	// The chat's session as it is now, for what only an open one can answer.
	const opened = (id: string): AcpSession => {
		const acp = found(id).connection?.acp;
		if (acp === undefined) throw new Error("The chat's agent is not running");
		return acp;
	};

	return {
		// Core starts the agent and holds its connection, so a plugin host
		// crash does not end a session (docs/spec/00-overview.md).
		async start(worktree: string, provider: string): Promise<string> {
			const id = randomUUID();
			const chat: Chat = { worktree, provider, agentSession: "", events: [] };
			const ready = open(chat, (event) => push(id, chat, event, chats.has(id)));
			const acp = await connect(chat, ready);
			chat.agentSession = acp.id;
			store.add({ id, worktree, provider, agentSession: acp.id });
			for (const [seq, event] of chat.events.entries()) {
				store.append(id, seq, event);
			}
			chats.set(id, chat);
			log
				.forWorktree(worktree)
				.info("agent session started", { sessionId: id, provider });
			return id;
		},
		// Ends the agents of worktrees not in use, such as settled ones, whose
		// chats resume when they are next needed, and forgets the chats of
		// worktrees no longer listed.
		keep({
			listed: kept,
			inUse,
		}: {
			listed: ReadonlySet<string>;
			inUse: ReadonlySet<string>;
		}) {
			for (const [id, chat] of chats) {
				if (inUse.has(chat.worktree)) continue;
				chat.connection?.acp?.close();
				delete chat.connection;
				if (!kept.has(chat.worktree)) chats.delete(id);
			}
			for (const [agent, worktree] of agents) {
				if (!inUse.has(worktree)) stop(agent);
			}
		},
		// For when core exits, which leaves no time to wait for them.
		shutdown() {
			for (const agent of agents.keys()) agent.kill();
		},
		list() {
			return [...chats].map(([sessionId, { worktree, provider, events }]) => ({
				sessionId,
				worktree,
				provider,
				events,
			}));
		},
		async prompt(id: string, text: string, attachments: PromptAttachment[]) {
			(await session(id)).prompt(text, attachments);
		},
		async setConfig(id: string, configId: string, value: string) {
			await (await session(id)).setConfig(configId, value);
		},
		// After the worktree's permission mode changed: the agents running for
		// it take it, and the others when they start.
		async permissionModeChanged(worktree: string) {
			await Promise.all(
				[...chats.values()].flatMap((chat) =>
					chat.worktree === worktree && chat.connection !== undefined
						? [
								chat.connection.ready.then(
									(acp) => applyMode(chat, acp),
									// Its start fails, and says why, on its own.
									() => undefined,
								),
							]
						: [],
				),
			);
		},
		// A chat without a running agent has no turn to stop.
		cancel(id: string) {
			found(id).connection?.acp?.cancel();
		},
		answerPermission(id: string, requestId: string, optionId: string) {
			opened(id).answerPermission(requestId, optionId);
		},
		answerQuestion(id: string, requestId: string, answer: QuestionAnswer) {
			opened(id).answerQuestion(requestId, answer);
		},
	};
};

export type AgentSessions = ReturnType<typeof createAgentSessions>;
