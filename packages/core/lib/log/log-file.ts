import {
	closeSync,
	existsSync,
	mkdirSync,
	openSync,
	renameSync,
	statSync,
	writeSync,
} from "node:fs";
import { join } from "node:path";
import type { LogLevel, LogRecord } from "@yaa/contracts/log";
import { logLevels } from "@yaa/contracts/log";

export type LogFileOptions = {
	dir: string;
	// Lines below this level are dropped.
	level: LogLevel;
	// Rotate when the next line would take the file past this size.
	maxBytes?: number;
	// Rotated files kept beside the current one: yaa.1.log is the newest.
	keep?: number;
	// Also print each line, for dev mode.
	echo?: (line: string) => void;
};

export type LogFile = {
	write(record: LogRecord): void;
	close(): void;
};

const name = (index: number) => (index === 0 ? "yaa.log" : `yaa.${index}.log`);

// One JSON object per line, written synchronously, so the lines before a
// crash are on disk.
export const openLogFile = ({
	dir,
	level,
	maxBytes = 5 * 1024 * 1024,
	keep = 3,
	echo,
}: LogFileOptions): LogFile => {
	mkdirSync(dir, { recursive: true });
	const path = join(dir, name(0));
	const minimum = logLevels.indexOf(level);
	let fd = openSync(path, "a");
	let size = statSync(path).size;

	const rotate = () => {
		closeSync(fd);
		for (let index = keep - 1; index >= 0; index--) {
			const from = join(dir, name(index));
			if (existsSync(from)) renameSync(from, join(dir, name(index + 1)));
		}
		fd = openSync(path, "a");
		size = 0;
	};

	return {
		write(record) {
			if (logLevels.indexOf(record.level) < minimum) return;
			const line = `${JSON.stringify({ ...record, at: new Date(record.at).toISOString() })}\n`;
			const bytes = Buffer.byteLength(line);
			if (size > 0 && size + bytes > maxBytes) rotate();
			writeSync(fd, line);
			size += bytes;
			echo?.(line.trimEnd());
		},
		close() {
			closeSync(fd);
		},
	};
};
