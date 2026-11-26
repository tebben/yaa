import * as z from "zod";

// What an agent provider says about its agent (docs/spec/05-agents-chat.md).
// The plugin host checks what a plugin returns against these.

// What a provider declares in its manifest; the UI hides the rest.
export const providerCapability = z.enum([
	"resume",
	"effort",
	"usage",
	"mcp-list",
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

const launch = {
	args: z.array(z.string()).optional(),
	// Added to the environment core starts the agent in.
	env: z.record(z.string(), z.string()).optional(),
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

export type ProviderCapability = z.infer<typeof providerCapability>;
export type Detection = z.infer<typeof detection>;
export type AuthStatus = z.infer<typeof authStatus>;
export type AgentSpawn = z.infer<typeof agentSpawn>;
export type ProviderStatus = z.infer<typeof providerStatus>;
