import type { TurnScript } from "../lib/turn-script.ts";

// A turn that starts a command and then fails, as when the agent loses its
// model connection.
export const failingTurn: TurnScript = {
	name: "fail",
	description: "Start a command, then fail the turn",
	steps: [
		{
			after: 200,
			update: {
				sessionUpdate: "agent_message_chunk",
				content: { type: "text", text: "Running the tests." },
			},
		},
		{
			after: 200,
			update: {
				sessionUpdate: "tool_call",
				toolCallId: "run-1",
				title: "pnpm test",
				kind: "execute",
				status: "in_progress",
			},
		},
		{ after: 600, fail: "The fake agent lost its connection to the model" },
	],
	stop: { reason: "end_turn" },
};
