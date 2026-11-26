import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { Readable, Writable } from "node:stream";
import { stripVTControlCharacters } from "node:util";
import { ndJsonStream } from "@agentclientprotocol/sdk/unstable";
import type { Logger } from "@yaa/contracts/log";
import { KILL_AFTER_MS, signalGroup } from "../process-group.ts";
import type { AgentConnection } from "./acp-session.ts";
import type { AgentLaunch } from "./agent-launch.ts";

// The last lines of stderr an exit is reported with.
const TAIL_LINES = 20;

export type AgentProcess = AgentConnection & {
	// Ends the agent and everything it started.
	stop(): void;
	// Ends them without waiting.
	kill(): void;
};

// Starts an agent in a folder and watches it: its stderr is logged, and
// `exited` says how it ended, with what it said last.
export const startAgentProcess = ({
	launch: { command, args, env },
	cwd,
	log,
}: {
	launch: AgentLaunch;
	cwd: string;
	log: Logger;
}): AgentProcess => {
	// Its own process group, so stopping reaches what it started.
	const child = spawn(command, args, {
		cwd,
		env: { ...process.env, ...env },
		detached: true,
		stdio: ["pipe", "pipe", "pipe"],
	});
	const tail: string[] = [];
	createInterface({ input: child.stderr }).on("line", (line) => {
		const text = stripVTControlCharacters(line);
		log.info(text);
		tail.push(text);
		if (tail.length > TAIL_LINES) tail.shift();
	});
	let killing: NodeJS.Timeout | undefined;
	let ended = false;
	const exited = new Promise<string>((resolve) => {
		let failed: string | undefined;
		child.on("error", (error) => {
			failed = error.message;
		});
		child.on("close", (code, signal) => {
			ended = true;
			clearTimeout(killing);
			const how =
				failed !== undefined
					? `could not start: ${failed}`
					: signal === null
						? `exited with code ${code}`
						: `was ended by signal ${signal}`;
			resolve([how, ...tail].join("\n"));
		});
	});

	return {
		stream: ndJsonStream(
			Writable.toWeb(child.stdin),
			Readable.toWeb(child.stdout),
		),
		exited,
		stop() {
			if (ended) return;
			signalGroup(child, "SIGTERM");
			killing = setTimeout(() => signalGroup(child, "SIGKILL"), KILL_AFTER_MS);
		},
		kill() {
			if (!ended) signalGroup(child, "SIGKILL");
		},
	};
};
