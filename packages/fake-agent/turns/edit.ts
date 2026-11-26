import type { TurnScript } from "../lib/turn-script.ts";

const text = (value: string) => ({ type: "text" as const, text: value });
const say = (after: number, value: string) => ({
	after,
	update: {
		sessionUpdate: "agent_message_chunk" as const,
		content: text(value),
	},
});
const think = (after: number, value: string) => ({
	after,
	update: {
		sessionUpdate: "agent_thought_chunk" as const,
		content: text(value),
	},
});

const file = "/fake/project/src/greeting.ts";

// A turn that reads a file, asks to edit it, asks a question and ends with
// usage: every update kind core normalizes, with an agent's pacing.
export const editTurn: TurnScript = {
	name: "edit",
	description: "Read a file, edit it with permission, and ask a question",
	steps: [
		{
			after: 100,
			update: {
				sessionUpdate: "session_info_update",
				title: "Make the greeting friendlier",
			},
		},
		think(200, "The user wants a friendlier greeting. "),
		think(150, "I should read greeting.ts before changing it."),
		{
			after: 200,
			update: {
				sessionUpdate: "plan",
				entries: [
					{
						content: "Read greeting.ts",
						priority: "high",
						status: "in_progress",
					},
					{ content: "Edit the greeting", priority: "high", status: "pending" },
				],
			},
		},
		say(150, "Let me look at the "),
		say(80, "current greeting first."),
		{
			after: 200,
			update: {
				sessionUpdate: "tool_call",
				toolCallId: "read-1",
				title: "Read src/greeting.ts",
				kind: "read",
				status: "in_progress",
				locations: [{ path: file }],
			},
		},
		{
			after: 400,
			update: {
				sessionUpdate: "tool_call_update",
				toolCallId: "read-1",
				status: "completed",
				content: [
					{
						type: "content",
						content: text('export const greeting = "Hello.";'),
					},
				],
			},
		},
		{
			after: 200,
			update: {
				sessionUpdate: "tool_call",
				toolCallId: "edit-1",
				title: "Edit src/greeting.ts",
				kind: "edit",
				status: "pending",
				locations: [{ path: file, line: 1 }],
			},
		},
		{
			after: 100,
			permission: {
				toolCall: { toolCallId: "edit-1" },
				options: [
					{ optionId: "allow", name: "Allow", kind: "allow_once" },
					{
						optionId: "always",
						name: "Always allow edits",
						kind: "allow_always",
					},
					{ optionId: "reject", name: "Reject", kind: "reject_once" },
				],
			},
		},
		{
			after: 300,
			update: {
				sessionUpdate: "tool_call_update",
				toolCallId: "edit-1",
				status: "completed",
				content: [
					{
						type: "diff",
						path: file,
						oldText: 'export const greeting = "Hello.";',
						newText: 'export const greeting = "Hi there!";',
					},
				],
			},
		},
		{
			after: 200,
			question: {
				message: "Should the farewell change too?",
				schema: {
					type: "object",
					properties: {
						farewell: {
							type: "string",
							title: "Farewell",
							oneOf: [
								{ const: "same", title: "Make it match" },
								{ const: "keep", title: "Leave it" },
							],
						},
						note: { type: "string", title: "Anything else?" },
					},
					required: ["farewell"],
				},
			},
		},
		{
			after: 100,
			update: {
				sessionUpdate: "plan",
				entries: [
					{
						content: "Read greeting.ts",
						priority: "high",
						status: "completed",
					},
					{
						content: "Edit the greeting",
						priority: "high",
						status: "completed",
					},
				],
			},
		},
		say(200, "The greeting now says "),
		say(80, "“Hi there!”."),
		{
			after: 100,
			update: {
				sessionUpdate: "usage_update",
				used: 18_400,
				size: 200_000,
				cost: { amount: 0.042, currency: "USD" },
			},
		},
	],
	stop: {
		reason: "end_turn",
		usage: {
			totalTokens: 2_350,
			inputTokens: 1_800,
			outputTokens: 550,
			thoughtTokens: 120,
			cachedReadTokens: 12_000,
		},
	},
};
