import {
	mkdirSync,
	readFileSync,
	renameSync,
	watch,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { FileProblem } from "@yaa/contracts/file-problem";
import type { Logger } from "@yaa/contracts/log";

export type SettingsFile<T> = {
	current(): T;
	// Called after a save changes what the file resolves to.
	onChange(listener: (value: T) => void): void;
	// The file as it is on disk; undefined while there is none.
	text(): string | undefined;
	// Replaces the file, and resolves it at once rather than after the watch
	// sees the save, so the listeners have heard of it when this returns.
	write(text: string): void;
};

export type SettingsFileOptions<T> = {
	dir: string;
	name: string;
	resolve(text: string | undefined): T;
	log: Logger;
};

// One save can fire several events, and an editor writing in place can fire
// one mid-write; reading once they stop sees the saved file.
const settleMs = 50;

const isMissing = (error: unknown) =>
	error instanceof Error && "code" in error && error.code === "ENOENT";

// Any other read error, such as a folder in the file's place, is not caught:
// the core exits with it in the log.
const readText = (path: string): string | undefined => {
	try {
		return readFileSync(path, "utf8");
	} catch (error) {
		if (isMissing(error)) return undefined;
		throw error;
	}
};

// Watches the folder, not the file: editors save by renaming a new file over
// the old one, which ends a watch on the old file.
export const watchSettingsFile = <T extends { problems: FileProblem[] }>({
	dir,
	name,
	resolve,
	log,
}: SettingsFileOptions<T>): SettingsFile<T> => {
	const path = join(dir, name);
	const listeners = new Set<(value: T) => void>();
	const load = () => {
		const value = resolve(readText(path));
		if (value.problems.length > 0) {
			log.warn(`${name} has problems`, { path, problems: value.problems });
		}
		return value;
	};

	mkdirSync(dir, { recursive: true });
	let value = load();
	let serialized = JSON.stringify(value);
	let timer: NodeJS.Timeout | undefined;

	const reload = () => {
		timer = undefined;
		const next = load();
		const nextSerialized = JSON.stringify(next);
		if (nextSerialized === serialized) return;
		value = next;
		serialized = nextSerialized;
		log.info(`${name} changed`, { path });
		for (const listener of listeners) listener(next);
	};

	// The watch lasts as long as the core.
	watch(dir, (_event, filename) => {
		if (filename !== null && filename !== name) return;
		clearTimeout(timer);
		timer = setTimeout(reload, settleMs);
	});

	return {
		current: () => value,
		onChange: (listener) => {
			listeners.add(listener);
		},
		text: () => readText(path),
		// Renamed over the old file, so an editor that has it open, or the
		// core's next read, never sees half of it.
		write: (text) => {
			const temporary = `${path}.${process.pid}.tmp`;
			writeFileSync(temporary, text);
			renameSync(temporary, path);
			clearTimeout(timer);
			reload();
		},
	};
};
