import * as z from "zod";

// The normalized events of an agent session (docs/spec/05-agents-chat.md).
// Core turns each agent's ACP messages into these; the chat, worktree state
// and plugins only ever see them.

const toolKind = z.enum([
	"read",
	"edit",
	"delete",
	"move",
	"search",
	"execute",
	"think",
	"fetch",
	"switch_mode",
	"other",
]);
const toolStatus = z.enum(["pending", "in_progress", "completed", "failed"]);

const location = z.object({
	path: z.string(),
	line: z.number().int().optional(),
});

// What a tool call produced: text, a file edit, or a terminal the agent ran.
const toolOutput = z.discriminatedUnion("type", [
	z.object({ type: z.literal("text"), text: z.string() }),
	z.object({
		type: z.literal("diff"),
		path: z.string(),
		oldText: z.string().optional(),
		newText: z.string(),
	}),
	z.object({ type: z.literal("terminal"), terminalId: z.string() }),
]);

const tool = {
	toolCallId: z.string(),
	title: z.string().optional(),
	kind: toolKind.optional(),
	locations: z.array(location).optional(),
	output: z.array(toolOutput).optional(),
};

const choice = z.object({ value: z.string(), label: z.string() });

// One field of an agent question, from the JSON Schema of an ACP form
// elicitation. A choice with `multiple` takes several values.
export const questionField = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("text"),
		name: z.string(),
		title: z.string(),
		required: z.boolean(),
	}),
	z.object({
		kind: z.literal("number"),
		name: z.string(),
		title: z.string(),
		required: z.boolean(),
		integer: z.boolean(),
	}),
	z.object({
		kind: z.literal("boolean"),
		name: z.string(),
		title: z.string(),
		required: z.boolean(),
	}),
	z.object({
		kind: z.literal("choice"),
		name: z.string(),
		title: z.string(),
		required: z.boolean(),
		multiple: z.boolean(),
		choices: z.array(choice),
	}),
]);

export const questionAnswer = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("accept"),
		values: z.record(
			z.string(),
			z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
		),
	}),
	z.object({ action: z.literal("decline") }),
	z.object({ action: z.literal("cancel") }),
]);

export const stopReason = z.enum([
	"end_turn",
	"max_tokens",
	"max_turn_requests",
	"refusal",
	"cancelled",
]);

// What a prompt carries besides its text: a file on this machine, which the
// agent reads itself, or an image sent with the prompt, in base64.
export const promptAttachment = z.discriminatedUnion("type", [
	z.object({ type: z.literal("file"), path: z.string() }),
	z.object({
		type: z.literal("image"),
		name: z.string(),
		mimeType: z.string(),
		data: z.string(),
	}),
]);

// An attachment as the prompt event keeps it, without an image's data.
const sentAttachment = z.discriminatedUnion("type", [
	z.object({ type: z.literal("file"), path: z.string() }),
	z.object({ type: z.literal("image"), name: z.string() }),
]);

export const agentEvent = z.discriminatedUnion("type", [
	// What the agent takes in a prompt, sent once when the session opens.
	z.object({ type: z.literal("capabilities"), images: z.boolean() }),
	// What the user sent, which starts a turn.
	z.object({
		type: z.literal("prompt"),
		text: z.string(),
		attachments: z.array(sentAttachment),
	}),
	z.object({ type: z.literal("message"), text: z.string() }),
	z.object({ type: z.literal("thinking"), text: z.string() }),
	z.object({
		type: z.literal("tool.start"),
		...tool,
		title: z.string(),
		status: toolStatus,
	}),
	z.object({
		type: z.literal("tool.update"),
		...tool,
		status: toolStatus.optional(),
	}),
	z.object({
		type: z.literal("tool.end"),
		...tool,
		status: z.enum(["completed", "failed"]),
	}),
	z.object({
		type: z.literal("plan"),
		entries: z.array(
			z.object({
				content: z.string(),
				priority: z.enum(["high", "medium", "low"]),
				status: z.enum(["pending", "in_progress", "completed"]),
			}),
		),
	}),
	// The agent waits for an answer until a matching `.resolved` event.
	z.object({
		type: z.literal("permission"),
		requestId: z.string(),
		toolCallId: z.string(),
		// Missing when the agent leaves it to the tool call's own title.
		title: z.string().optional(),
		options: z.array(
			z.object({
				optionId: z.string(),
				name: z.string(),
				kind: z.enum([
					"allow_once",
					"allow_always",
					"reject_once",
					"reject_always",
				]),
			}),
		),
	}),
	// Null when the turn was cancelled before an answer.
	z.object({
		type: z.literal("permission.resolved"),
		requestId: z.string(),
		optionId: z.string().nullable(),
	}),
	z.object({
		type: z.literal("question"),
		requestId: z.string(),
		message: z.string(),
		fields: z.array(questionField),
	}),
	z.object({
		type: z.literal("question.resolved"),
		requestId: z.string(),
		action: z.enum(["accept", "decline", "cancel"]),
	}),
	// Slash commands and skills the agent offers.
	z.object({
		type: z.literal("commands"),
		commands: z.array(
			z.object({
				name: z.string(),
				description: z.string(),
				hint: z.string().optional(),
			}),
		),
	}),
	z.object({ type: z.literal("title"), title: z.string() }),
	// The session's config options, grouped by category (model,
	// thought_level, mode); sent again whenever the agent changes them.
	z.object({
		type: z.literal("config"),
		options: z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				category: z.string().optional(),
				value: z.union([z.string(), z.boolean()]),
				choices: z.array(choice).optional(),
			}),
		),
	}),
	z.object({
		type: z.literal("usage"),
		used: z.number(),
		size: z.number(),
		cost: z.object({ amount: z.number(), currency: z.string() }).optional(),
	}),
	z.object({
		type: z.literal("turn.end"),
		stopReason,
		tokens: z
			.object({
				input: z.number(),
				output: z.number(),
				total: z.number(),
				thought: z.number().optional(),
				cacheRead: z.number().optional(),
				cacheWrite: z.number().optional(),
			})
			.optional(),
	}),
	// The turn failed, or the agent process could not be reached.
	z.object({ type: z.literal("error"), message: z.string() }),
]);

// An event as core sends it: numbered per session from 0, so a client that
// read the session's history can skip events it already has.
export const sessionEvent = z.object({
	sessionId: z.string(),
	worktree: z.string(),
	provider: z.string(),
	seq: z.number().int(),
	event: agentEvent,
});

export type AgentEvent = z.infer<typeof agentEvent>;
export type SessionEvent = z.infer<typeof sessionEvent>;
export type PromptAttachment = z.infer<typeof promptAttachment>;
export type ToolKind = z.infer<typeof toolKind>;
export type QuestionField = z.infer<typeof questionField>;
export type QuestionAnswer = z.infer<typeof questionAnswer>;
export type StopReason = z.infer<typeof stopReason>;
