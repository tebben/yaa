// Fails when a component or stylesheet writes a colour as a literal instead
// of a token (docs/rules/svelte.md). The generated packages/ui/theme.css is
// where the literals live, so it is skipped. Named colours such as `white`
// are not caught.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const GENERATED = "packages/ui/theme.css";
const COLOUR =
	/(?<![\w&#-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/gi;

const files = execFileSync(
	"git",
	[
		"ls-files",
		"--cached",
		"--others",
		"--exclude-standard",
		"apps",
		"packages",
		"plugins",
	],
	{ encoding: "utf8" },
)
	.split("\n")
	.filter((file) => /\.(svelte|svelte\.ts|css)$/.test(file))
	.filter((file) => file !== GENERATED);

const problems = files.flatMap((file) =>
	readFileSync(file, "utf8")
		.split("\n")
		.flatMap((line, index) =>
			[...line.matchAll(COLOUR)].map(
				(match) =>
					`${file}:${index + 1}: colour literal ${match[0]}; use a token from docs/design/tokens.json`,
			),
		),
);

if (problems.length > 0) {
	for (const problem of problems) console.error(problem);
	process.exit(1);
}
