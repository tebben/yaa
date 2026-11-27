import type { LogRecord, NumberedLogRecord } from "@yaa/contracts/log";

export type RecentLogs = {
	add(record: LogRecord): void;
	// The lines kept, oldest first, and the number the next line will get.
	list(): { records: NumberedLogRecord[]; next: number };
	onAdd(listener: (line: NumberedLogRecord) => void): void;
};

// The last lines logged at every level, debug included, for the debug panel
// (docs/spec/11-platform-services.md). Numbered, so a client that reads them
// while new ones arrive takes each once.
export const createRecentLogs = (keep = 10_000): RecentLogs => {
	// A ring: line `seq` sits at `seq % keep`.
	const ring: NumberedLogRecord[] = [];
	let next = 0;
	const listeners = new Set<(line: NumberedLogRecord) => void>();

	return {
		add(record) {
			const line = { seq: next, record };
			ring[next % keep] = line;
			next += 1;
			for (const listener of listeners) listener(line);
		},
		list() {
			const start = next % keep;
			const records =
				next <= keep
					? [...ring]
					: [...ring.slice(start), ...ring.slice(0, start)];
			return { records, next };
		},
		onAdd(listener) {
			listeners.add(listener);
		},
	};
};
