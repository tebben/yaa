// Fails when the docs drift from their own rules (docs/rules/docs.md):
// a spec `##` section without a `Lands in:` line, a `docs/` path that does
// not exist, or a spec file missing from the index in docs/README.md.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const tracked = execFileSync(
	"git",
	["ls-files", "--cached", "--others", "--exclude-standard", "*.md"],
	{ encoding: "utf8" },
)
	.split("\n")
	.filter((file) => file.endsWith(".md") && !file.startsWith(".claude/"));

const specs = tracked.filter((file) => /^docs\/spec\/[^/]+\.md$/.test(file));

const missingLandsIn = (file: string): string[] => {
	const lines = readFileSync(file, "utf8").split("\n");
	return lines.flatMap((line, index) => {
		if (!line.startsWith("## ")) return [];
		const next = lines.slice(index + 1).find((l) => l.trim() !== "");
		return next?.startsWith("Lands in:")
			? []
			: [`${file}:${index + 1}: "${line}" has no "Lands in:" line`];
	});
};

const DOCS_PATH = /(?<![\w/.-])docs\/[\w./*-]*[\w*]/g;

// `*` and placeholders such as `NNNN` stand for any name: check the folder.
const pathExists = (path: string): boolean => {
	const wild = path.search(/\*|NN/);
	return existsSync(wild === -1 ? path : path.slice(0, wild));
};

const brokenPaths = (file: string): string[] =>
	readFileSync(file, "utf8")
		.split("\n")
		.flatMap((line, index) =>
			[...line.matchAll(DOCS_PATH)]
				.map((match) => match[0])
				.filter((path) => !pathExists(path))
				.map((path) => `${file}:${index + 1}: ${path} does not exist`),
		);

const index = readFileSync("docs/README.md", "utf8");
const unindexed = specs
	.filter((file) => !index.includes(`spec/${basename(file, ".md")}`))
	.map((file) => `${file} is missing from the index in docs/README.md`);

const problems = [
	...specs.flatMap(missingLandsIn),
	...tracked.flatMap(brokenPaths),
	...unindexed,
];

if (problems.length > 0) {
	for (const problem of problems) console.error(problem);
	process.exit(1);
}
