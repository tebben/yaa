// Writes the token files in packages/ui from docs/design/tokens.json.
// With --check, writes nothing and fails when a file is out of date.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateTokenFiles } from "../packages/ui/token-codegen.ts";

const check = process.argv.includes("--check");
const files = generateTokenFiles(
	JSON.parse(readFileSync("docs/design/tokens.json", "utf8")),
);

const stale = Object.entries(files).flatMap(([name, content]) => {
	const path = join("packages/ui", name);
	if (existsSync(path) && readFileSync(path, "utf8") === content) return [];
	if (!check) writeFileSync(path, content);
	return [path];
});

if (check && stale.length > 0) {
	for (const path of stale) {
		console.error(`${path} is out of date: run pnpm run tokens`);
	}
	process.exit(1);
}
