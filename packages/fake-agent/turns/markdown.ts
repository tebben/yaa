import type { TurnScript } from "../lib/turn-script.ts";

const chunks = [
	"## Greeting\n\nThe greeting lives in `src/greeting.ts:1`",
	" and is **exported**. See [the docs](https://agentclientprotocol.com).\n\n",
	'```ts\nexport const greeting = "Hi there!";\n',
	'export const farewell = "Bye."; // unchanged\n```\n\n',
	"| Name | Value |\n| --- | --- |\n| greeting | Hi there! |\n\n",
	"- It is a constant.\n- Nothing else reads it.\n",
];

// A turn of markdown, streamed in pieces that split a code block, for the
// chat's rendering.
export const markdownTurn: TurnScript = {
	name: "markdown",
	description: "Reply with headings, code, a table and a list",
	steps: chunks.map((text) => ({
		after: 150,
		update: {
			sessionUpdate: "agent_message_chunk",
			content: { type: "text", text },
		},
	})),
	stop: { reason: "end_turn" },
};
