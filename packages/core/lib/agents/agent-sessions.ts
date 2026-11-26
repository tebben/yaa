import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Readable, Writable } from "node:stream";
import { ndJsonStream } from "@agentclientprotocol/sdk/unstable";
import type {
	AgentEvent,
	QuestionAnswer,
	SessionEvent,
} from "@yaa/contracts/agent-events";
import type { CoreEvent } from "@yaa/contracts/core-events";
import { errorData, type Logger } from "@yaa/contracts/log";
import { chatEvent } from "../state/chat-event.ts";
import { type AcpSession, openAcpSession } from "./acp-session.ts";

export type AgentSessionsOptions = {
	// The fake agent's script, in dev mode only. Provider plugins replace it
	// in M2 (docs/spec/05-agents-chat.md).
	fakeAgent: string | null;
	// A worktree's folder, where its agents start.
	folder(worktree: string): string;
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
	events: AgentEvent[];
};

// Runs the fake agent as its own process, as a real agent runs: Electron's
// binary in Node mode, ACP over its stdio.
const spawnFakeAgent = (script: string, agentLog: Logger) => {
	const child = spawn(process.execPath, [script], {
		env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
		stdio: ["pipe", "pipe", "pipe"],
	});
	// A process that never starts closes its pipes, which fails the session's
	// first request; the reason is logged here.
	child.on("error", (error) =>
		agentLog.error("agent failed", errorData(error)),
	);
	child.stderr.setEncoding("utf8");
	child.stderr.on("data", (text: string) => agentLog.warn(text.trimEnd()));
	return ndJsonStream(
		Writable.toWeb(child.stdin),
		Readable.toWeb(child.stdout),
	);
};

// The agent sessions core holds, each with every event it has sent, so a
// client that connects later reads the history (the renderer keeps no
// business state, see docs/spec/00-overview.md).
export const createAgentSessions = ({
	fakeAgent,
	folder,
	record,
	log,
	agentLog,
	emit,
}: AgentSessionsOptions) => {
	const sessions = new Map<string, Session>();

	const session = (sessionId: string): AcpSession => {
		const found = sessions.get(sessionId);
		if (found === undefined) throw new Error(`No session ${sessionId}`);
		return found.acp;
	};

	return {
		async start(worktree: string): Promise<string> {
			if (fakeAgent === null) {
				throw new Error("No agent available: the fake agent runs in dev mode");
			}
			const cwd = folder(worktree);
			const sessionId = randomUUID();
			const events: AgentEvent[] = [];
			const acp = await openAcpSession({
				stream: spawnFakeAgent(fakeAgent, agentLog),
				cwd,
				log,
				emit(event) {
					events.push(event);
					const logged = chatEvent({ worktree, chat: sessionId }, event);
					if (logged !== undefined) record(logged);
					emit({ sessionId, seq: events.length - 1, event });
				},
			});
			sessions.set(sessionId, { acp, worktree, events });
			log.info("agent session started", { sessionId, worktree });
			return sessionId;
		},
		list() {
			return [...sessions].map(([sessionId, { worktree, events }]) => ({
				sessionId,
				worktree,
				events,
			}));
		},
		prompt(sessionId: string, text: string) {
			session(sessionId).prompt(text);
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
