import { execFile } from "node:child_process";

// Runs git in `dir` and gives its output. Git's own message, without the
// "fatal: " prefix, becomes the error's message, so a caller can show it.
export type RunGit = (dir: string, args: readonly string[]) => Promise<string>;

// Plain English output, and never a prompt for credentials: nobody would
// see it.
const env = { ...process.env, LC_ALL: "C", GIT_TERMINAL_PROMPT: "0" };

const gitMessage = (stderr: string) =>
	stderr
		.trim()
		.split("\n")[0]
		?.replace(/^(fatal|error): /, "");

export const runGit: RunGit = (dir, args) =>
	new Promise((resolve, reject) => {
		execFile(
			"git",
			["-C", dir, ...args],
			{ env, maxBuffer: 64 * 1024 * 1024 },
			(error, stdout, stderr) => {
				if (error === null) resolve(stdout);
				else
					reject(
						new Error(gitMessage(stderr) || error.message, { cause: error }),
					);
			},
		);
	});
