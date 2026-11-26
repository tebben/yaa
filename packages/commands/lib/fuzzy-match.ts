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

const normalize = (text: string) => text.toLowerCase().replaceAll(/\s+/g, "");

// How well `text` matches `query`, case and spaces in the query ignored:
// lower is better, 0 for an empty query, undefined for no match.
export const fuzzyScore = (query: string, text: string): number | undefined =>
	score(normalize(query), text.toLowerCase());

// The items whose label matches `query`, best first; ties keep their order.
// An empty query keeps all.
export const fuzzyMatch = <T>(
	query: string,
	items: readonly T[],
	label: (item: T) => string,
): T[] =>
	items
		.flatMap((item) => {
			const value = fuzzyScore(query, label(item));
			return value === undefined ? [] : [{ item, value }];
		})
		.sort((a, b) => a.value - b.value)
		.map((entry) => entry.item);
