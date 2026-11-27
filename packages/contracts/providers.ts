import * as z from "zod";

// What an agent provider says about its agent (docs/spec/05-agents-chat.md).
// The plugin host checks what a plugin returns against these.

// What a provider declares in its manifest; the UI hides the rest.
// `discovery`: it lists the MCP servers and skills its agent loads;
// `mcp-toggling` and `skill-toggling`: its agent leaves out the ones yaa
// switches off (docs/spec/09-mcp-skills.md).
export const providerCapability = z.enum([
	"resume",
	"effort",
	"usage",
	"discovery",
	"mcp-toggling",
	"skill-toggling",
]);

export const detection = z.discriminatedUnion("installed", [
	z.strictObject({ installed: z.literal(true), version: z.string() }),
	// `problem` says what is missing and what to do about it.
	z.strictObject({ installed: z.literal(false), problem: z.string() }),
]);

export const authStatus = z.discriminatedUnion("state", [
	// `account` names what pays, such as a subscription or an API key.
	z.strictObject({
		state: z.literal("signed-in"),
		account: z.string().optional(),
	}),
	// `login` is the agent's own command that signs in.
	z.strictObject({ state: z.literal("signed-out"), login: z.string() }),
	// The agent cannot say; a session may still work.
	z.strictObject({ state: z.literal("unknown") }),
]);

// Where the agent finds an MCP server or a skill: its config for the user,
// its config for this repository, or a file in the worktree's folder.
export const contextLevel = z.enum(["user", "project", "worktree"]);

// An MCP server or skill an agent's configuration names.
export const discoveredItem = z.strictObject({
	name: z.string().min(1),
	level: contextLevel,
	// The file or folder that names it, for the user to look at.
	source: z.string(),
	description: z.string().optional(),
	// False when the agent's own configuration leaves it out, such as a
	// project's MCP server the user has not approved; yaa cannot turn it on.
	active: z.boolean(),
});

export const discovery = z.strictObject({
	mcpServers: z.array(discoveredItem),
	skills: z.array(discoveredItem),
});

// What yaa switches off for one session, by name.
export const switchedOff = z.strictObject({
	mcpServers: z.array(z.string()),
	skills: z.array(z.string()),
});

const launch = {
	args: z.array(z.string()).optional(),
	// Added to the environment core starts the agent in.
	env: z.record(z.string(), z.string()).optional(),
	// Sent as `_meta` with the ACP request that opens or resumes the session.
	sessionMeta: z.record(z.string(), z.unknown()).optional(),
};

// How core starts the agent process, which speaks ACP over its stdio.
export const agentSpawn = z.discriminatedUnion("run", [
	z.strictObject({
		run: z.literal("command"),
		command: z.string().min(1),
		...launch,
	}),
	// The plugin's agent module (`agent` in its manifest), run with Node.
	z.strictObject({ run: z.literal("module"), ...launch }),
]);

// A provider as the app shows it: whether a chat can start with it.
export const providerStatus = z.discriminatedUnion("state", [
	z.object({ state: z.literal("missing"), problem: z.string() }),
	z.object({
		state: z.literal("signed-out"),
		version: z.string(),
		login: z.string(),
	}),
	z.object({
		state: z.literal("ready"),
		version: z.string(),
		account: z.string().optional(),
	}),
]);

// An agent as the settings screen shows it: whether a session opens with it,
// and the models it then offers.
export const agentReport = z.discriminatedUnion("state", [
	z.object({ state: z.literal("missing"), problem: z.string() }),
	// `how` says how to sign in.
	z.object({
		state: z.literal("signed-out"),
		version: z.string(),
		how: z.string(),
	}),
	z.object({
		state: z.literal("connected"),
		version: z.string(),
		account: z.string().optional(),
		models: z.array(z.object({ value: z.string(), label: z.string() })),
		// The model a new session starts on.
		model: z.string().optional(),
	}),
	z.object({ state: z.literal("failed"), problem: z.string() }),
]);

export type AgentReport = z.infer<typeof agentReport>;
export type ProviderCapability = z.infer<typeof providerCapability>;
export type Detection = z.infer<typeof detection>;
export type AuthStatus = z.infer<typeof authStatus>;
export type AgentSpawn = z.infer<typeof agentSpawn>;
export type ProviderStatus = z.infer<typeof providerStatus>;
export type ContextLevel = z.infer<typeof contextLevel>;
export type DiscoveredItem = z.infer<typeof discoveredItem>;
export type Discovery = z.infer<typeof discovery>;
export type SwitchedOff = z.infer<typeof switchedOff>;
