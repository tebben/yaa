import type { TokenFile } from "./token-file.ts";

export type CssVariable = { name: string; value: string };

// camelCase to kebab-case; a dot becomes `_`, which Tailwind reads back as a
// dot, so `--spacing-0_5` makes `p-0.5`.
const cssName = (key: string): string =>
	key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replaceAll(".", "_");

const inGroup = (
	prefix: string,
	group: Record<string, string>,
): CssVariable[] =>
	Object.entries(group).map(([key, value]) => ({
		name: `${prefix}-${cssName(key)}`,
		value,
	}));

// Each token group lands in the Tailwind theme namespace that makes its
// utilities: font sizes in `text`, line heights in `leading`, weights in
// `font-weight`, and both space
// and size in `spacing`, so `p-2` and `h-row` work.
export const cssVariables = (tokens: TokenFile): CssVariable[] => {
	const variables = [
		{ name: "font-sans", value: tokens.font.sans },
		{ name: "font-mono", value: tokens.font.mono },
		...inGroup("text", tokens.font.size),
		...inGroup("leading", tokens.font.lineHeight),
		...inGroup("font-weight", tokens.font.weight),
		...inGroup("radius", tokens.radius),
		...inGroup("spacing", tokens.space),
		...inGroup("spacing", tokens.size),
		...Object.entries(tokens.color).flatMap(([key, value]) =>
			typeof value === "string"
				? [{ name: `color-${cssName(key)}`, value }]
				: inGroup(`color-${cssName(key)}`, value),
		),
	];
	const seen = new Set<string>();
	for (const { name } of variables) {
		if (seen.has(name)) throw new Error(`Two tokens map to --${name}`);
		seen.add(name);
	}
	return variables;
};
