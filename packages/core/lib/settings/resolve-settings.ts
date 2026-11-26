import type { FileProblem } from "@yaa/contracts/file-problem";
import type { SettingDefinitions } from "@yaa/contracts/settings";
import * as z from "zod";
import { issueProblems } from "./issue-problems.ts";
import { parseJson } from "./parse-json.ts";

const settingsObject = z.record(z.string(), z.unknown());

// settings.json to values: each setting is checked on its own, so one bad
// value falls back to its default without losing the rest of the file.
export const resolveSettings = <D extends SettingDefinitions>(
	definitions: D,
	text: string | undefined,
) => {
	const problems: FileProblem[] = [];
	const accepted: Record<string, unknown> = {};
	const parsed = parseJson(text);
	if (parsed.kind === "invalid") problems.push(parsed.problem);
	if (parsed.kind === "json") {
		const file = settingsObject.safeParse(parsed.data);
		if (!file.success) {
			problems.push({ path: [], message: "Expected a JSON object" });
		} else {
			for (const [key, value] of Object.entries(file.data)) {
				const schema = Object.hasOwn(definitions, key)
					? definitions[key]
					: undefined;
				if (schema === undefined) {
					problems.push({ path: [key], message: "Unknown setting" });
					continue;
				}
				const result = schema.safeParse(value);
				if (result.success) accepted[key] = value;
				else problems.push(...issueProblems([key], result.error));
			}
		}
	}
	return { values: z.object(definitions).parse(accepted), problems };
};
