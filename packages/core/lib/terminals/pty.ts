import { accessSync, constants, readlinkSync } from "node:fs";
import { basename } from "node:path";
import type { TerminalSize } from "@yaa/contracts/terminals";
import { spawn } from "node-pty";

// A program running in a pseudo-terminal.
export type Pty = {
	write(data: string): void;
	resize(size: TerminalSize): void;
	// A paused program blocks once the pseudo-terminal's buffer is full.
	pause(): void;
	resume(): void;
	kill(): void;
	onData(listener: (data: string) => void): void;
	onExit(listener: () => void): void;
	// The program in the foreground.
	title(): string;
	// The shell's working directory, where the system tells it.
	cwd(): string | undefined;
};

export type SpawnPty = (
	options: TerminalSize & {
		shell: string;
		cwd: string;
		env: NodeJS.ProcessEnv;
	},
) => Pty;

export const spawnPty: SpawnPty = ({ shell, cwd, env, cols, rows }) => {
	// node-pty reports a program it cannot run only as one that ended at once.
	accessSync(shell, constants.X_OK);
	const child = spawn(shell, [], {
		name: "xterm-256color",
		cwd,
		env,
		cols,
		rows,
	});
	return {
		write: (data) => child.write(data),
		resize: ({ cols, rows }) => child.resize(cols, rows),
		pause: () => child.pause(),
		resume: () => child.resume(),
		kill: () => child.kill(),
		onData: (listener) => {
			child.onData(listener);
		},
		onExit: (listener) => {
			child.onExit(() => listener());
		},
		title: () => basename(child.process),
		cwd() {
			try {
				return readlinkSync(`/proc/${child.pid}/cwd`);
			} catch (error) {
				// The process has ended, or the system has no /proc.
				if (!(error instanceof Error && "code" in error)) throw error;
				return undefined;
			}
		},
	};
};
