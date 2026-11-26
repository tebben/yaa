import { parseWhen } from "@yaa/commands/when";
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

// keybindings.json to bindings: a rejected entry, a malformed `when`
// included, is dropped and the others still apply.
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
		if (!result.success) {
			problems.push(...issueProblems([index], result.error));
			return;
		}
		const { when } = result.data;
		const condition = when === undefined ? undefined : parseWhen(when);
		if (condition?.ok === false) {
			problems.push({ path: [index, "when"], message: condition.message });
			return;
		}
		bindings.push(result.data);
	});
	return { bindings, problems };
};
