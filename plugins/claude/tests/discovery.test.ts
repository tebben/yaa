import { describe, expect, it } from "vitest";
import { discover, sessionMeta } from "../discovery.ts";

// Files by path; a folder's entries are what the paths under it name.
const files = (contents: Record<string, string>) => ({
	read: async (path: string) => contents[path],
	readDir: async (folder: string) =>
		[
			...new Set(
				Object.keys(contents)
					.filter((path) => path.startsWith(`${folder}/`))
					.map((path) => path.slice(folder.length + 1).split("/")[0] ?? ""),
			),
		].map((name) => ({ name, folder: true })),
});

const folders = { cwd: "/trees/fix", repository: "/code/app" };

const json = JSON.stringify;

describe("discover", () => {
	it("lists servers by level, the repository's own from the main checkout", async () => {
		const { mcpServers } = await discover(
			files({
				"~/.claude.json": json({
					mcpServers: { docs: {} },
					projects: {
						"/code/app": { mcpServers: { db: {} } },
						"/trees/fix": { mcpServers: { ignored: {} } },
					},
				}),
				"/trees/fix/.mcp.json": json({
					mcpServers: { tracker: {}, unapproved: {} },
				}),
				"/code/app/.claude/settings.local.json": json({
					disabledMcpjsonServers: ["unapproved"],
				}),
			}),
			folders,
		);

		expect(
			mcpServers.map(({ name, level, active }) => [name, level, active]),
		).toEqual([
			["docs", "user", true],
			["db", "project", true],
			["tracker", "worktree", true],
			["unapproved", "worktree", false],
		]);
	});

	it("names skills by folder and honors the user's own overrides", async () => {
		const { skills } = await discover(
			files({
				"~/.claude/skills/review/SKILL.md":
					'---\nname: other\ndescription: "Reviews a diff"\n---\n',
				"~/.claude/skills/empty/notes.md": "",
				"/trees/fix/.claude/skills/release/SKILL.md": "No front matter",
				"~/.claude/settings.json": json({
					skillOverrides: { release: "off" },
				}),
			}),
			folders,
		);

		expect(skills).toEqual([
			{
				name: "review",
				level: "user",
				source: "~/.claude/skills/review",
				description: "Reviews a diff",
				active: true,
			},
			{
				name: "release",
				level: "worktree",
				source: "/trees/fix/.claude/skills/release",
				active: false,
			},
		]);
	});

	it("fails on a file it cannot read, naming it", async () => {
		await expect(
			discover(files({ "/trees/fix/.mcp.json": "{" }), folders),
		).rejects.toThrow("/trees/fix/.mcp.json");
	});
});

describe("sessionMeta", () => {
	it("says nothing when nothing is switched off", () => {
		expect(sessionMeta({ mcpServers: [], skills: [] })).toBeUndefined();
	});

	it("denies servers and switches skills off", () => {
		expect(
			sessionMeta({ mcpServers: ["docs"], skills: ["review"] }),
		).toMatchObject({
			claudeCode: {
				options: {
					settings: {
						deniedMcpServers: [{ serverName: "docs" }],
						skillOverrides: { review: "off" },
					},
				},
			},
		});
	});
});
