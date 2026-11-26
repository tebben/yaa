import { fuzzyMatch } from "@yaa/commands/fuzzy-match";

type SlashCommand = { name: string };

// What is typed of a slash command: a draft that is a `/` and a word.
export const commandQuery = (draft: string): string | undefined =>
	/^\/(\S*)$/.exec(draft)?.[1];

// The commands to suggest for the draft, best first. None once the draft
// names the only match in full, so Enter sends it.
export const suggestCommands = <C extends SlashCommand>(
	draft: string,
	commands: readonly C[],
): C[] => {
	const query = commandQuery(draft);
	if (query === undefined) return [];
	const matches = fuzzyMatch(query, commands, ({ name }) => name);
	return matches.length === 1 && matches[0]?.name === query ? [] : matches;
};
