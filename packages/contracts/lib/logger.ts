import type { LogLevel, LogRecord, LogSource } from "../log.ts";

type Data = Record<string, unknown>;

export type Logger = Record<
	LogLevel,
	(message: string, data?: Data) => void
> & {
	// The same logger with each line tagged with the worktree it is about.
	forWorktree(worktree: string): Logger;
};

export const createLogger = (
	write: (record: LogRecord) => void,
	source: LogSource,
	now: () => number = Date.now,
	worktree?: string,
): Logger => {
	const at =
		(level: LogLevel) =>
		(message: string, data?: Data): void =>
			write({
				at: now(),
				level,
				source,
				message,
				...(worktree === undefined ? {} : { worktree }),
				...(data === undefined ? {} : { data }),
			});
	return {
		debug: at("debug"),
		info: at("info"),
		warn: at("warn"),
		error: at("error"),
		forWorktree: (id) => createLogger(write, source, now, id),
	};
};

// Errors as log data: the message and stack, which JSON.stringify drops.
export const errorData = (error: unknown): Data =>
	error instanceof Error
		? { error: error.message, stack: error.stack }
		: { error: String(error) };
