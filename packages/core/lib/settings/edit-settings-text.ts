import { parseJson } from "./parse-json.ts";

const isObject = (data: unknown): data is Record<string, unknown> =>
	typeof data === "object" && data !== null && !Array.isArray(data);

// settings.json with one setting changed, or taken out when `value` is
// undefined. Everything else in the file stays, unknown keys included. A
// file that does not parse is the user's to fix: it throws rather than
// write over it.
export const editSettingsText = (
	text: string | undefined,
	key: string,
	value: unknown,
): string => {
	const parsed = parseJson(text);
	if (parsed.kind === "invalid") {
		throw new Error(
			`settings.json does not parse (${parsed.problem.message}); fix it first`,
		);
	}
	const file = parsed.kind === "empty" ? {} : parsed.data;
	if (!isObject(file)) {
		throw new Error("settings.json is not a JSON object; fix it first");
	}
	const { [key]: _old, ...rest } = file;
	const next = value === undefined ? rest : { ...file, [key]: value };
	return `${JSON.stringify(next, null, "\t")}\n`;
};
