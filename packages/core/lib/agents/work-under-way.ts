import type { AgentEvent } from "@yaa/contracts/agent-events";

// What starts work in a chat, and what ends it. A session opening sends
// `capabilities` first, which ends a resume.
const STARTS = new Set<AgentEvent["type"]>(["prompt", "resuming"]);
const ENDS = new Set<AgentEvent["type"]>([
	"capabilities",
	"turn.end",
	"error",
	"interrupted",
]);

// Whether a chat's events leave work under way: a turn, or a resume, that
// nothing ended. After a restart that work is over.
export const workUnderWay = (events: readonly AgentEvent[]): boolean => {
	const last = events.findLast(
		({ type }) => STARTS.has(type) || ENDS.has(type),
	);
	return last !== undefined && STARTS.has(last.type);
};
