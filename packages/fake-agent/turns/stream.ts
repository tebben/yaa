import type { TurnScript } from "../lib/turn-script.ts";

const SECTIONS = 40;
// About as much as a fast model sends at once.
const PIECE = 24;

const section = (number: number) =>
	[
		`### Section ${number}`,
		"The greeting is read by the **header** and the `src/greeting.ts:1` module, so a change to it shows in both places.",
		"- It is a constant.\n- It is exported once.",
		`\`\`\`ts\nexport const greeting${number} = "Hi there!";\nexport const length${number} = greeting${number}.length;\n\`\`\``,
	].join("\n\n");

const reply = `${Array.from({ length: SECTIONS }, (_, at) => section(at + 1)).join("\n\n")}\n\nEnd of the stream.`;

// One long reply of markdown in many small pieces, several to a frame, for
// measuring how the chat streams.
export const streamTurn: TurnScript = {
	name: "stream",
	description: "Stream a long reply in small, fast pieces",
	steps: Array.from({ length: Math.ceil(reply.length / PIECE) }, (_, at) => ({
		after: 4,
		update: {
			sessionUpdate: "agent_message_chunk",
			content: {
				type: "text",
				text: reply.slice(at * PIECE, (at + 1) * PIECE),
			},
		},
	})),
	stop: { reason: "end_turn" },
};
