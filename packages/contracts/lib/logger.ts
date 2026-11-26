import type { LogLevel, LogRecord, LogSource } from "../log.ts";

type Data = Record<string, unknown>;

export type Logger = Record<LogLevel, (message: string, data?: Data) => void>;

export const createLogger = (
	write: (record: LogRecord) => void,
	source: LogSource,
	now: () => number = Date.now,
): Logger => {
	const at =
		(level: LogLevel) =>
		(message: string, data?: Data): void =>
			write({
				at: now(),
				level,
				source,
				message,
				...(data === undefined ? {} : { data }),
			});
	return {
		debug: at("debug"),
		info: at("info"),
		warn: at("warn"),
		error: at("error"),
	};
};

// Errors as log data: the message and stack, which JSON.stringify drops.
export const errorData = (error: unknown): Data =>
	error instanceof Error
		? { error: error.message, stack: error.stack }
		: { error: String(error) };
