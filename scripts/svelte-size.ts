// Warns when a .svelte file is large enough to split (docs/rules/svelte.md).
// A warning, not a failure: the limits are proposals until real code tests them.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const MAX_FILE_LINES = 150;
const MAX_SCRIPT_LINES = 40;

const files = execFileSync(
	"git",
	["ls-files", "--cached", "--others", "--exclude-standard", "*.svelte"],
	{ encoding: "utf8" },
)
	.split("\n")
	.filter((file) => file.endsWith(".svelte") && !file.startsWith(".claude/"));

const scriptLines = (source: string): number => {
	const match = /<script[^>]*>([\s\S]*?)<\/script>/.exec(source);
	return match?.[1] === undefined ? 0 : match[1].trim().split("\n").length;
};

const warn = (file: string, message: string): void => {
	if (process.env["GITHUB_ACTIONS"] === "true") {
		console.log(`::warning file=${file}::${message}`);
	} else {
		console.warn(`warning ${file}: ${message}`);
	}
};

for (const file of files) {
	const source = readFileSync(file, "utf8");
	const lines = source.split("\n").length;
	const script = scriptLines(source);
	if (lines > MAX_FILE_LINES) {
		warn(file, `${lines} lines (over ${MAX_FILE_LINES}); split it`);
	}
	if (script > MAX_SCRIPT_LINES) {
		warn(
			file,
			`<script> has ${script} lines (over ${MAX_SCRIPT_LINES}); move logic to a .svelte.ts controller or pure .ts`,
		);
	}
}
