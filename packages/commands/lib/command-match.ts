type Matchable = { title: string; category?: string };

const isWordStart = (text: string, at: number) =>
	at === 0 || /[\s:./-]/.test(text.charAt(at - 1));

const nextWordStart = (text: string, char: string, from: number) => {
	for (let at = text.indexOf(char, from); at >= 0; ) {
		if (isWordStart(text, at)) return at;
		at = text.indexOf(char, at + 1);
	}
	return -1;
};

// Lower is better; undefined when the query's characters do not all appear,
// in order, in the text. Each character continues the current run, or else
// starts at the next word that begins with it, for free; failing both, it
// takes the next occurrence and costs the distance skipped.
const score = (query: string, text: string): number | undefined => {
	let total = 0;
	let from = 0;
	for (const char of query) {
		let at = text.charAt(from) === char ? from : -1;
		if (at < 0) at = nextWordStart(text, char, from);
		if (at < 0) {
			at = text.indexOf(char, from);
			if (at < 0) return undefined;
			total += at - from + 1;
		}
		from = at + 1;
	}
	return total;
};

// The commands whose category and title match `query` (case and spaces
// ignored), best first; ties keep their order. An empty query keeps all.
export const matchCommands = <T extends Matchable>(
	query: string,
	commands: readonly T[],
): T[] => {
	const needle = query.toLowerCase().replaceAll(/\s+/g, "");
	if (needle === "") return [...commands];
	return commands
		.flatMap((command) => {
			const label = `${command.category ?? ""} ${command.title}`;
			const value = score(needle, label.toLowerCase());
			return value === undefined ? [] : [{ command, value }];
		})
		.sort((a, b) => a.value - b.value)
		.map((entry) => entry.command);
};
