import type { DiscoveredItem, Discovery, PluginContext } from "@yaa/plugin-api";
import * as z from "zod";

// What the Claude Code CLI loads for a session, read from its files as far as
// the provider lists it (docs/decisions/0040-switching-mcp-servers-and-skills.md,
// Claude Code 2.1.332). Plugins and claude.ai connectors are not listed.

type UserFiles = PluginContext["userFiles"];

const names = z.array(z.string()).optional();
const servers = z.record(z.string(), z.unknown()).optional();

const settingsFile = z.object({
	disabledMcpjsonServers: names,
	deniedMcpServers: z
		.array(z.object({ serverName: z.string().optional() }))
		.optional(),
	skillOverrides: z.record(z.string(), z.string()).optional(),
});

// `~/.claude.json`: the user's servers, and each repository's own.
const configFile = z.object({
	mcpServers: servers,
	projects: z
		.record(
			z.string(),
			z.object({ mcpServers: servers, disabledMcpjsonServers: names }),
		)
		.optional(),
});

const mcpFile = z.object({ mcpServers: servers });

// A file that is there but cannot be read fails the discovery: a server it
// names would otherwise be loaded without the user seeing it.
const readJson = async <T extends z.ZodType>(
	files: UserFiles,
	path: string,
	schema: T,
): Promise<z.output<T> | undefined> => {
	const text = await files.read(path);
	if (text === undefined) return undefined;
	try {
		return schema.parse(JSON.parse(text));
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(`Cannot read ${path}: ${reason}`);
	}
};

// The `description` line of a SKILL.md front matter.
export const skillDescription = (text: string): string | undefined => {
	const matter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
	const line = /^description:[ \t]*(.+)$/m.exec(matter ?? "")?.[1]?.trim();
	// A block scalar, whose text is on the lines that follow.
	if (line === undefined || /^[>|][+-]?$/.test(line)) return undefined;
	return line.replace(/^(["'])(.*)\1$/, "$2");
};

export const discover = async (
	files: UserFiles,
	{ cwd, repository }: { cwd: string; repository: string },
): Promise<Discovery> => {
	const config = await readJson(files, "~/.claude.json", configFile);
	const project = config?.projects?.[repository];
	// Later files win, as Claude Code has them. A worktree takes the main
	// checkout's local settings too.
	const settings = await Promise.all(
		[
			...new Set([
				"~/.claude/settings.json",
				`${cwd}/.claude/settings.json`,
				`${repository}/.claude/settings.local.json`,
				`${cwd}/.claude/settings.local.json`,
			]),
		].map((path) => readJson(files, path, settingsFile)),
	);
	const denied = new Set(
		settings.flatMap(
			(file) =>
				file?.deniedMcpServers?.flatMap(({ serverName }) => serverName ?? []) ??
				[],
		),
	);
	const unapproved = new Set([
		...(project?.disabledMcpjsonServers ?? []),
		...settings.flatMap((file) => file?.disabledMcpjsonServers ?? []),
	]);
	const overrides = new Map(
		settings.flatMap((file) => Object.entries(file?.skillOverrides ?? {})),
	);

	const listed = (
		from: Record<string, unknown> | undefined,
		level: DiscoveredItem["level"],
		source: string,
		off: ReadonlySet<string> = new Set(),
	): DiscoveredItem[] =>
		Object.keys(from ?? {}).map((name) => ({
			name,
			level,
			source,
			active: !denied.has(name) && !off.has(name),
		}));

	// A skill is the folder with a SKILL.md, and goes by the folder's name.
	const skills = async (
		folder: string,
		level: DiscoveredItem["level"],
	): Promise<DiscoveredItem[]> => {
		const entries = await files.readDir(folder);
		const found = await Promise.all(
			entries
				.filter((entry) => entry.folder)
				.map(async ({ name }) => {
					const source = `${folder}/${name}`;
					const text = await files.read(`${source}/SKILL.md`);
					if (text === undefined) return [];
					const description = skillDescription(text);
					return [
						{
							name,
							level,
							source,
							active: overrides.get(name) !== "off",
							...(description === undefined ? {} : { description }),
						},
					];
				}),
		);
		return found.flat();
	};

	const mcpJson = `${cwd}/.mcp.json`;
	return {
		mcpServers: [
			...listed(config?.mcpServers, "user", "~/.claude.json"),
			...listed(project?.mcpServers, "project", "~/.claude.json"),
			...listed(
				(await readJson(files, mcpJson, mcpFile))?.mcpServers,
				"worktree",
				mcpJson,
				unapproved,
			),
		],
		skills: [
			...(await skills("~/.claude/skills", "user")),
			...(await skills(`${cwd}/.claude/skills`, "worktree")),
		],
	};
};
