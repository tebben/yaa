import * as z from "zod";

export const logLevels = ["debug", "info", "warn", "error"] as const;
export const logLevel = z.enum(logLevels);

// Where a line came from. Every process logs to the core, which writes one
// file (docs/spec/11-platform-services.md).
export const logSource = z.enum([
	"main",
	"core",
	"plugin-host",
	"agent",
	"workflow",
]);

export const logRecord = z.object({
	at: z.number(),
	level: logLevel,
	source: logSource,
	message: z.string(),
	// The worktree the line is about, which the debug panel filters on.
	worktree: z.string().optional(),
	data: z.record(z.string(), z.unknown()).optional(),
});

// A record as core's recent lines hold it, numbered in the order logged.
export const numberedLogRecord = z.object({
	seq: z.number(),
	record: logRecord,
});

export type LogLevel = z.infer<typeof logLevel>;
export type LogSource = z.infer<typeof logSource>;
export type LogRecord = z.infer<typeof logRecord>;
export type NumberedLogRecord = z.infer<typeof numberedLogRecord>;

export { createLogger, errorData, type Logger } from "./lib/logger.ts";
