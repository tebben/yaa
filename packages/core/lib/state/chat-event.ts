import type { AgentEvent } from "@yaa/contracts/agent-events";
import type { CoreEvent } from "@yaa/contracts/core-events";

// What an agent event means for the worktree's state, as the event core
// logs; undefined for one that changes no state.
export const chatEvent = (
	source: { worktree: string; chat: string },
	event: AgentEvent,
): CoreEvent | undefined => {
	switch (event.type) {
		case "prompt":
			return { type: "chat.turn.started", ...source };
		case "turn.end":
			return { type: "chat.turn.ended", ...source };
		case "error":
			return { type: "chat.turn.failed", ...source, reason: event.message };
		case "permission":
		case "question":
			return {
				type: "chat.request.opened",
				...source,
				requestId: event.requestId,
			};
		case "permission.resolved":
		case "question.resolved":
			return {
				type: "chat.request.resolved",
				...source,
				requestId: event.requestId,
			};
		default:
			return undefined;
	}
};
