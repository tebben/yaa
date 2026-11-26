import type { FileProblem } from "@yaa/contracts/file-problem";
import {
	type Keybinding,
	type KeybindingsState,
	keybinding,
} from "@yaa/contracts/keybindings";
import * as z from "zod";
import { issueProblems } from "./issue-problems.ts";
import { parseJson } from "./parse-json.ts";

const entries = z.array(z.unknown());

// keybindings.json to bindings: a rejected entry is dropped and the others
// still apply.
export const resolveKeybindings = (
	text: string | undefined,
): KeybindingsState => {
	const parsed = parseJson(text);
	if (parsed.kind === "empty") return { bindings: [], problems: [] };
	if (parsed.kind === "invalid") {
		return { bindings: [], problems: [parsed.problem] };
	}
	const file = entries.safeParse(parsed.data);
	if (!file.success) {
		return {
			bindings: [],
			problems: [{ path: [], message: "Expected a JSON array" }],
		};
	}
	const bindings: Keybinding[] = [];
	const problems: FileProblem[] = [];
	file.data.forEach((entry, index) => {
		const result = keybinding.safeParse(entry);
		if (result.success) bindings.push(result.data);
		else problems.push(...issueProblems([index], result.error));
	});
	return { bindings, problems };
};
