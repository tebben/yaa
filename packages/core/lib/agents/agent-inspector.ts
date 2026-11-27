import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import type { AgentEvent } from "@yaa/contracts/agent-events";
import type { Logger } from "@yaa/contracts/log";
import type {
	AgentReport,
	ProviderStatus,
	SwitchedOff,
} from "@yaa/contracts/providers";
import { openAcpSession, SignInRequired } from "./acp-session.ts";
import type { AgentLaunch } from "./agent-launch.ts";
import { type AgentProcess, startAgentProcess } from "./agent-process.ts";
import { UNLISTED } from "./session-context.ts";

const OPEN_TIMEOUT_MS = 30_000;

export type AgentInspectorOptions = {
	status(provider: string): Promise<ProviderStatus>;
	launch(provider: string, cwd: string, off: SwitchedOff): Promise<AgentLaunch>;
	// The app's own folder to open sessions in, so none is a worktree's.
	dir: string;
	log: Logger;
	agentLog: Logger;
	start?: typeof startAgentProcess;
};

const describe = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const models = (events: readonly AgentEvent[]) => {
	const config = events.findLast((event) => event.type === "config");
	const option = config?.options.find(({ category }) => category === "model");
	return {
		models: option?.choices ?? [],
		...(typeof option?.value === "string" ? { model: option.value } : {}),
	};
};

// Whether each provider's agent is connected: installed, and opening a
// session, which is also where its models come from. A session without a
// prompt leaves nothing behind
// (docs/decisions/0014-acp-coverage.md).
export const createAgentInspector = ({
	status,
	launch,
	dir,
	log,
	agentLog,
	start = startAgentProcess,
}: AgentInspectorOptions) => {
	const running = new Set<AgentProcess>();

	const open = async (provider: string, events: AgentEvent[]) => {
		await mkdir(dir, { recursive: true });
		const how = await launch(provider, dir, UNLISTED.off);
		const agent = start({ launch: how, cwd: dir, log: agentLog });
		running.add(agent);
		const timeout = new AbortController();
		try {
			const session = await Promise.race([
				openAcpSession({
					agent,
					cwd: dir,
					meta: how.sessionMeta,
					log,
					emit: (event) => events.push(event),
				}),
				delay(OPEN_TIMEOUT_MS, undefined, { signal: timeout.signal }).then(
					() => {
						throw new Error(
							`The agent opened no session in ${OPEN_TIMEOUT_MS / 1000} s`,
						);
					},
				),
			]);
			session.close();
		} finally {
			timeout.abort();
			running.delete(agent);
			agent.stop();
		}
	};

	return {
		async inspect(provider: string): Promise<AgentReport> {
			try {
				const found = await status(provider);
				if (found.state === "missing") return found;
				const { version } = found;
				if (found.state === "signed-out") {
					const how = `Run \`${found.login}\` in your terminal.`;
					return { state: "signed-out", version, how };
				}
				const events: AgentEvent[] = [];
				try {
					await open(provider, events);
				} catch (error) {
					if (!(error instanceof SignInRequired)) throw error;
					return { state: "signed-out", version, how: error.message };
				}
				const { account } = found;
				return {
					state: "connected",
					version,
					...(account === undefined ? {} : { account }),
					...models(events),
				};
			} catch (error) {
				return { state: "failed", problem: describe(error) };
			}
		},
		// For when core exits.
		shutdown() {
			for (const agent of running) agent.kill();
		},
	};
};

export type AgentInspector = ReturnType<typeof createAgentInspector>;
