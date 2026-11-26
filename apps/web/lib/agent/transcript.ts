import type { AgentEvent, QuestionField } from "@yaa/contracts/agent-events";

type Event<T extends AgentEvent["type"]> = Extract<AgentEvent, { type: T }>;
type ToolEvent = Event<"tool.start" | "tool.update" | "tool.end">;

// `key` is the index of the event that started the item, stable while
// later events extend it.
export type TranscriptItem = { key: number } & (
	| { kind: "prompt"; text: string }
	| { kind: "message" | "thinking"; text: string }
	| {
			kind: "tool";
			toolCallId: string;
			title: string;
			status: Event<"tool.start">["status"];
			output: NonNullable<ToolEvent["output"]>;
	  }
	| {
			kind: "permission";
			requestId: string;
			title: string;
			options: Event<"permission">["options"];
			// Undefined while the agent waits; null when the turn was cancelled.
			answer: string | null | undefined;
	  }
	| {
			kind: "question";
			requestId: string;
			message: string;
			fields: QuestionField[];
			answer: Event<"question.resolved">["action"] | undefined;
	  }
	| { kind: "turn.end"; stopReason: string }
	| { kind: "error"; message: string }
);

// A session's events as the placeholder chat shows them: chunks joined into
// one message, each tool call as one item, and the latest of the values the
// agent keeps sending (title, plan, usage, commands).
export type Transcript = {
	items: TranscriptItem[];
	title: string | undefined;
	plan: Event<"plan">["entries"];
	usage: Omit<Event<"usage">, "type"> | undefined;
	commands: Event<"commands">["commands"];
	// From the turn's start to its end or error.
	running: boolean;
};

const appendText = (
	items: TranscriptItem[],
	key: number,
	kind: "message" | "thinking",
	text: string,
) => {
	const last = items.at(-1);
	if (last?.kind === kind) {
		items[items.length - 1] = { ...last, text: last.text + text };
	} else items.push({ key, kind, text });
};

const updateTool = (items: TranscriptItem[], key: number, event: ToolEvent) => {
	const index = items.findIndex(
		(item) => item.kind === "tool" && item.toolCallId === event.toolCallId,
	);
	const tool = items[index];
	if (tool?.kind !== "tool") {
		items.push({
			key,
			kind: "tool",
			toolCallId: event.toolCallId,
			title: event.title ?? event.toolCallId,
			status: event.status ?? "pending",
			output: event.output ?? [],
		});
		return;
	}
	items[index] = {
		...tool,
		title: event.title ?? tool.title,
		status: event.status ?? tool.status,
		output: [...tool.output, ...(event.output ?? [])],
	};
};

const toolTitle = (items: TranscriptItem[], toolCallId: string) => {
	const tool = items.find(
		(item) => item.kind === "tool" && item.toolCallId === toolCallId,
	);
	return tool?.kind === "tool" ? tool.title : toolCallId;
};

const resolve = (
	items: TranscriptItem[],
	kind: "permission" | "question",
	requestId: string,
	update: (item: TranscriptItem) => TranscriptItem,
) => {
	const index = items.findIndex(
		(item) =>
			item.kind === kind && "requestId" in item && item.requestId === requestId,
	);
	const item = items[index];
	if (item !== undefined) items[index] = update(item);
};

export const foldTranscript = (events: readonly AgentEvent[]): Transcript => {
	const items: TranscriptItem[] = [];
	const transcript: Transcript = {
		items,
		title: undefined,
		plan: [],
		usage: undefined,
		commands: [],
		running: false,
	};
	for (const [key, event] of events.entries()) {
		switch (event.type) {
			case "prompt":
				items.push({ key, kind: "prompt", text: event.text });
				transcript.running = true;
				break;
			case "message":
			case "thinking":
				appendText(items, key, event.type, event.text);
				break;
			case "tool.start":
			case "tool.update":
			case "tool.end":
				updateTool(items, key, event);
				break;
			case "permission":
				items.push({
					key,
					kind: "permission",
					requestId: event.requestId,
					title: event.title ?? toolTitle(items, event.toolCallId),
					options: event.options,
					answer: undefined,
				});
				break;
			case "permission.resolved":
				resolve(items, "permission", event.requestId, (item) =>
					item.kind === "permission"
						? { ...item, answer: event.optionId }
						: item,
				);
				break;
			case "question":
				items.push({
					key,
					kind: "question",
					requestId: event.requestId,
					message: event.message,
					fields: event.fields,
					answer: undefined,
				});
				break;
			case "question.resolved":
				resolve(items, "question", event.requestId, (item) =>
					item.kind === "question" ? { ...item, answer: event.action } : item,
				);
				break;
			case "turn.end":
				items.push({ key, kind: "turn.end", stopReason: event.stopReason });
				transcript.running = false;
				break;
			case "error":
				items.push({ key, kind: "error", message: event.message });
				transcript.running = false;
				break;
			case "title":
				transcript.title = event.title;
				break;
			case "plan":
				transcript.plan = event.entries;
				break;
			case "usage":
				transcript.usage = {
					used: event.used,
					size: event.size,
					cost: event.cost,
				};
				break;
			case "commands":
				transcript.commands = event.commands;
				break;
			case "config":
				break;
		}
	}
	return transcript;
};
