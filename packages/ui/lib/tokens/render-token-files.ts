import type { CssVariable } from "./css-variables.ts";

const notice =
	"Generated from docs/design/tokens.json by `pnpm run tokens`. Do not edit.";

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

export const tokenNamesTs = (variables: CssVariable[]): string =>
	[
		`// ${notice}`,
		"",
		"// Every token's CSS variable name, without the leading `--`.",
		"export type TokenName =",
		`${variables.map(({ name }) => `\t| "${name}"`).join("\n")};`,
		"",
	].join("\n");
