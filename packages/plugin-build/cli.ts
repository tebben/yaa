#!/usr/bin/env node
// Builds each plugin folder given: yaa-plugin-build plugins/hello
import { resolve } from "node:path";
import { buildPlugin } from "./lib/build-plugin.ts";

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
	console.error("Usage: yaa-plugin-build <plugin folder>...");
	process.exit(2);
}
for (const dir of dirs) {
	const { id, version } = await buildPlugin(resolve(dir));
	console.log(`built ${id} ${version}`);
}
