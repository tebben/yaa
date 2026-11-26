import { randomUUID } from "node:crypto";
import type {
	AgentEvent,
	PromptAttachment,
	QuestionAnswer,
	SessionEvent,
} from "@yaa/contracts/agent-events";
import type { CoreEvent } from "@yaa/contracts/core-events";
import type { Logger } from "@yaa/contracts/log";
import type { Worktree } from "@yaa/contracts/projects";
import { chatEvent } from "../state/chat-event.ts";
import { type AcpSession, openAcpSession } from "./acp-session.ts";
import type { AgentLaunch } from "./agent-launch.ts";
import { type AgentProcess, startAgentProcess } from "./agent-process.ts";

export type AgentSessionsOptions = {
	// How to start a provider's agent in a folder, from its plugin.
	launch(provider: string, cwd: string): Promise<AgentLaunch>;
	// A listed worktree, where its agents start; throws for one that is gone.
	worktree(id: string): Pick<Worktree, "path" | "index">;
	// Logs the events the worktree's state is derived from.
	record(event: CoreEvent): void;
	log: Logger;
	// For the lines agents write to stderr.
	agentLog: Logger;
	emit(event: SessionEvent): void;
};

type Session = {
	acp: AcpSession;
	worktree: string;
	provider: string;
	events: AgentEvent[];
};

// The agent sessions core holds, each with every event it has sent, so a
// client that connects later reads the history (the renderer keeps no
// business state, see docs/spec/00-overview.md).
export const createAgentSessions = ({
	launch,
	worktree: listed,
	record,
	log,
	agentLog,
	emit,
}: AgentSessionsOptions) => {
	const sessions = new Map<string, Session>();
	// The worktree of every agent still wanted, those of sessions being opened
	// included.
	const agents = new Map<AgentProcess, string>();

	const session = (sessionId: string): AcpSession => {
		const found = sessions.get(sessionId);
		if (found === undefined) throw new Error(`No session ${sessionId}`);
		return found.acp;
	};

	const stop = (agent: AgentProcess) => {
		agents.delete(agent);
		agent.stop();
	};

	return {
		// Core starts the agent and holds its connection, so a plugin host
		// crash does not end a session (docs/spec/00-overview.md).
		async start(worktree: string, provider: string): Promise<string> {
			const how = await launch(provider, listed(worktree).path);
			// Read again: the worktree may have been finished meanwhile.
			const { path, index } = listed(worktree);
			const sessionId = randomUUID();
			const events: AgentEvent[] = [];
			const agent = startAgentProcess({
				launch: {
					...how,
					env: { ...how.env, YAA_WORKTREE_INDEX: String(index) },
				},
				cwd: path,
				log: agentLog,
			});
			agents.set(agent, worktree);
			try {
				const acp = await openAcpSession({
					agent,
					cwd: path,
					log,
					emit(event) {
						events.push(event);
						const logged = chatEvent({ worktree, chat: sessionId }, event);
						if (logged !== undefined) record(logged);
						emit({
							sessionId,
							worktree,
							provider,
							seq: events.length - 1,
							event,
						});
					},
				});
				if (!agents.has(agent)) {
					acp.close();
					throw new Error("The worktree was closed while its agent started");
				}
				sessions.set(sessionId, { acp, worktree, provider, events });
			} catch (error) {
				stop(agent);
				throw error;
			}
			log.info("agent session started", { sessionId, worktree, provider });
			return sessionId;
		},
		// Ends the sessions and agents of worktrees no longer listed.
		keep(worktrees: ReadonlySet<string>) {
			for (const [sessionId, { acp, worktree }] of sessions) {
				if (worktrees.has(worktree)) continue;
				acp.close();
				sessions.delete(sessionId);
			}
			for (const [agent, worktree] of agents) {
				if (!worktrees.has(worktree)) stop(agent);
			}
		},
		// For when core exits, which leaves no time to wait for them.
		shutdown() {
			for (const agent of agents.keys()) agent.kill();
		},
		list() {
			return [...sessions].map(
				([sessionId, { worktree, provider, events }]) => ({
					sessionId,
					worktree,
					provider,
					events,
				}),
			);
		},
		prompt(sessionId: string, text: string, attachments: PromptAttachment[]) {
			session(sessionId).prompt(text, attachments);
		},
		setConfig(sessionId: string, configId: string, value: string) {
			return session(sessionId).setConfig(configId, value);
		},
		cancel(sessionId: string) {
			session(sessionId).cancel();
		},
		answerPermission(sessionId: string, requestId: string, optionId: string) {
			session(sessionId).answerPermission(requestId, optionId);
		},
		answerQuestion(
			sessionId: string,
			requestId: string,
			answer: QuestionAnswer,
		) {
			session(sessionId).answerQuestion(requestId, answer);
		},
	};
};

export type AgentSessions = ReturnType<typeof createAgentSessions>;
