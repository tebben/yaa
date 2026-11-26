import type { DatabaseSync } from "node:sqlite";
import * as z from "zod";

// Any discriminated union with a string `type`, such as coreEvent.
type EventSchema = z.ZodType<{ type: string }>;

export type StoredEvent<S extends EventSchema> = {
	seq: number;
	at: number;
	event: z.output<S>;
};

export type EventLog<S extends EventSchema> = {
	// Validates and stores the event; returns its sequence number.
	append(event: z.input<S>): number;
	// Events after a sequence number, oldest first.
	read(options?: { after?: number; limit?: number }): StoredEvent<S>[];
};

const row = z.object({ seq: z.number(), at: z.number(), event: z.string() });

export const createEventLog = <S extends EventSchema>(
	db: DatabaseSync,
	schema: S,
	now: () => number = Date.now,
): EventLog<S> => {
	const insert = db.prepare(
		"INSERT INTO events (at, type, event) VALUES (?, ?, ?)",
	);
	const select = db.prepare(
		"SELECT seq, at, event FROM events WHERE seq > ? ORDER BY seq LIMIT ?",
	);
	const parse = (data: unknown): z.output<S> => schema.parse(data);

	return {
		append(event) {
			const valid = parse(event);
			const result = insert.run(now(), valid.type, JSON.stringify(valid));
			return Number(result.lastInsertRowid);
		},
		read({ after = 0, limit = 1000 } = {}) {
			return select.all(after, limit).map((raw) => {
				const { seq, at, event } = row.parse(raw);
				return { seq, at, event: parse(JSON.parse(event)) };
			});
		},
	};
};
