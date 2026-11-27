import { describe, expect, it } from "vitest";
import { parseDiscovery } from "../cli.ts";

describe("parseDiscovery", () => {
	it("reads the level, source and state of what the CLI lists", () => {
		const found = parseDiscovery({
			mcpServers: JSON.stringify({
				mcpServers: {
					docs: {
						source: "workspace",
						sourcePath: "/repo/.mcp.json",
						enabled: true,
					},
					metrics: { source: "plugin", sourcePlugin: "dd", enabled: false },
				},
			}),
			skills: JSON.stringify([
				{
					name: "review",
					description: "Reviews a diff",
					source: "project",
					path: "/repo/.claude/skills/review",
					enabled: true,
				},
				{ name: "cloud", source: "builtin", enabled: true },
			]),
		});

		expect(found.mcpServers).toEqual([
			{
				name: "docs",
				level: "worktree",
				source: "/repo/.mcp.json",
				active: true,
			},
			{ name: "metrics", level: "user", source: "plugin dd", active: false },
		]);
		expect(found.skills.map(({ name, level }) => [name, level])).toEqual([
			["review", "worktree"],
			["cloud", "user"],
		]);
	});
});
