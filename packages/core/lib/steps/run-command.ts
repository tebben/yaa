import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { stripVTControlCharacters } from "node:util";
import { KILL_AFTER_MS, signalGroup } from "../process-group.ts";

export type RunCommand = (run: {
	command: string;
	cwd: string;
	env: NodeJS.ProcessEnv;
	// Aborting ends the command and everything it started.
	signal: AbortSignal;
	line(text: string): void;
}) => Promise<{ problem?: string }>;

// Runs a command with sh, without a terminal or input, so it must run
// unattended (docs/decisions/0023-setup-output-and-sign-in-before-the-terminal.md).
// It has ended when it has exited and nothing it started holds its output.
export const runCommand: RunCommand = ({ command, cwd, env, signal, line }) =>
	new Promise((resolve) => {
		// Its own process group, so stopping reaches what it started.
		const child = spawn("/bin/sh", ["-c", command], {
			cwd,
			env,
			detached: true,
			stdio: ["ignore", "pipe", "pipe"],
		});
		for (const stream of [child.stdout, child.stderr]) {
			createInterface({ input: stream }).on("line", (text) =>
				line(stripVTControlCharacters(text)),
			);
		}
		let killing: NodeJS.Timeout | undefined;
		const stop = () => {
			signalGroup(child, "SIGTERM");
			killing = setTimeout(() => {
				signalGroup(child, "SIGKILL");
				// Something that left the group may still hold the output.
				child.stdout.destroy();
				child.stderr.destroy();
			}, KILL_AFTER_MS);
		};
		if (signal.aborted) stop();
		else signal.addEventListener("abort", stop, { once: true });
		let failed: string | undefined;
		child.on("error", (error) => {
			failed = error.message;
		});
		child.on("close", (code, ended) => {
			clearTimeout(killing);
			signal.removeEventListener("abort", stop);
			if (failed !== undefined) resolve({ problem: failed });
			else if (code === 0) resolve({});
			else {
				resolve({
					problem:
						ended === null ? `exit code ${code}` : `ended by signal ${ended}`,
				});
			}
		});
	});
