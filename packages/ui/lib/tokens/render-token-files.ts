import type { CssVariable } from "./css-variables.ts";

const notice =
	"Generated from docs/design/tokens.json by `pnpm run tokens`. Do not edit.";

// A string literal as the formatter writes it: in single quotes when that
// saves escaping double ones.
const literal = (text: string) =>
	text.includes('"') && !text.includes("'")
		? `'${text}'`
		: JSON.stringify(text);

// `static` emits every variable, not only those Tailwind utilities use, so
// plugin styles can read any token with var().
export const themeCss = (variables: CssVariable[]): string =>
	[
		`/* ${notice} */`,
		"@theme static {",
		...variables.map(({ name, value }) => `\t--${name}: ${value};`),
		"}",
		"",
	].join("\n");

export const tokensTs = (variables: CssVariable[]): string =>
	[
		`// ${notice}`,
		"",
		"// Every token's CSS variable name, without the leading `--`.",
		"export type TokenName =",
		`${variables.map(({ name }) => `\t| "${name}"`).join("\n")};`,
		"",
		"// Every token's value in the built-in theme, by name.",
		"export const tokenValues = {",
		...variables.map(({ name, value }) => `\t"${name}": ${literal(value)},`),
		"} as const satisfies Record<TokenName, string>;",
		"",
	].join("\n");
