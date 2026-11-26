// Fails on TypeScript suppression comments that give no reason.
// Biome already rejects `@ts-ignore` and `biome-ignore` without a reason;
// it has no rule for `@ts-expect-error` or `@ts-nocheck`.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE = /\.(ts|js|mjs|cjs|svelte)$/;
const BARE = /@ts-(expect-error|nocheck)\s*(\*\/|-->)?\s*$/;

const files = execFileSync(
	"git",
	["ls-files", "--cached", "--others", "--exclude-standard"],
	{ encoding: "utf8" },
)
	.split("\n")
	.filter((file) => SOURCE.test(file) && !file.startsWith(".claude/"));

const problems = files.flatMap((file) =>
	readFileSync(file, "utf8")
		.split("\n")
		.flatMap((line, index) =>
			BARE.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [],
		),
);

if (problems.length > 0) {
	console.error(
		"Suppression comments need a reason, e.g. `// @ts-expect-error -- why`:",
	);
	for (const problem of problems) console.error(`  ${problem}`);
	process.exit(1);
}
