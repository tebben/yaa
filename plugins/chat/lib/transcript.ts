import type { AgentEvent, QuestionField } from "@yaa/contracts/agent-events";

type Event<T extends AgentEvent["type"]> = Extract<AgentEvent, { type: T }>;
type ToolEvent = Event<"tool.start" | "tool.update" | "tool.end">;

export type ConfigOption = Event<"config">["options"][number];
export type ToolOutput = NonNullable<ToolEvent["output"]>[number];

// `key` is the index of the event that started the item, stable while
// later events extend it.
export type TranscriptItem = { key: number } & (
	| {
			kind: "prompt";
			text: string;
			attachments: Event<"prompt">["attachments"];
	  }
	| { kind: "message" | "thinking"; text: string }
	| {
			kind: "tool";
			toolCallId: string;
			title: string;
			tool: NonNullable<ToolEvent["kind"]>;
			// `stopped` when the turn ended before the call did.
			status: Event<"tool.start">["status"] | "stopped";
			locations: NonNullable<ToolEvent["locations"]>;
			output: ToolOutput[];
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
	// A turn that ended some other way than by the agent finishing.
	| { kind: "stopped"; reason: Event<"turn.end">["stopReason"] }
	| { kind: "error"; message: string }
);

// A session's events as the chat shows them: chunks joined into one message,
// each tool call as one item, and the latest of the values the agent keeps
// sending (title, plan, usage, commands, options).
export type Transcript = {
	// How many events it holds.
	count: number;
	items: readonly TranscriptItem[];
	title: string | undefined;
	plan: Event<"plan">["entries"];
	usage: Omit<Event<"usage">, "type"> | undefined;
	commands: Event<"commands">["commands"];
	config: readonly ConfigOption[];
	// Whether the agent takes images in a prompt.
	images: boolean;
	// From the turn's start to its end or error.
	running: boolean;
};

export const EMPTY_TRANSCRIPT: Transcript = {
	count: 0,
	items: [],
	title: undefined,
	plan: [],
	usage: undefined,
	commands: [],
	config: [],
	images: false,
	running: false,
};

// A transcript being extended.
type Draft = Transcript & { items: TranscriptItem[] };

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

// A start is a new call, even under an id an earlier turn used. An update
// names what changed; what it names replaces what was there, the output
// included (ACP's tool call update).
const applyTool = (items: TranscriptItem[], key: number, event: ToolEvent) => {
	const index =
		event.type === "tool.start"
			? -1
			: items.findLastIndex(
					(item) =>
						item.kind === "tool" && item.toolCallId === event.toolCallId,
				);
	const tool = items[index];
	if (tool?.kind !== "tool") {
		items.push({
			key,
			kind: "tool",
			toolCallId: event.toolCallId,
			title: event.title ?? event.toolCallId,
			tool: event.kind ?? "other",
			status: event.status ?? "pending",
			locations: event.locations ?? [],
			output: event.output ?? [],
		});
		return;
	}
	items[index] = {
		...tool,
		title: event.title ?? tool.title,
		tool: event.kind ?? tool.tool,
		status: event.status ?? tool.status,
		locations: event.locations ?? tool.locations,
		output: event.output ?? tool.output,
	};
};

// A call still open when its turn ends will report no more.
const endTurn = (draft: Draft) => {
	for (const [index, item] of draft.items.entries()) {
		if (
			item.kind === "tool" &&
			(item.status === "pending" || item.status === "in_progress")
		) {
			draft.items[index] = { ...item, status: "stopped" };
		}
	}
	draft.running = false;
};

const toolTitle = (items: readonly TranscriptItem[], toolCallId: string) => {
	const tool = items.findLast(
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
	const index = items.findLastIndex(
		(item) =>
			item.kind === kind && "requestId" in item && item.requestId === requestId,
	);
	const item = items[index];
	if (item !== undefined) items[index] = update(item);
};

const apply = (draft: Draft, event: AgentEvent) => {
	const { items, count: key } = draft;
	switch (event.type) {
		case "capabilities":
			draft.images = event.images;
			break;
		case "prompt":
			items.push({
				key,
				kind: "prompt",
				text: event.text,
				attachments: event.attachments,
			});
			draft.running = true;
			break;
		case "message":
		case "thinking":
			appendText(items, key, event.type, event.text);
			break;
		case "tool.start":
		case "tool.update":
		case "tool.end":
			applyTool(items, key, event);
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
				item.kind === "permission" ? { ...item, answer: event.optionId } : item,
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
			endTurn(draft);
			if (event.stopReason !== "end_turn") {
				items.push({ key, kind: "stopped", reason: event.stopReason });
			}
			break;
		case "error":
			endTurn(draft);
			items.push({ key, kind: "error", message: event.message });
			break;
		case "title":
			draft.title = event.title;
			break;
		case "plan":
			draft.plan = event.entries;
			break;
		case "usage":
			draft.usage = { used: event.used, size: event.size, cost: event.cost };
			break;
		case "commands":
			draft.commands = event.commands;
			break;
		case "config":
			draft.config = event.options;
			break;
	}
	draft.count += 1;
};

// The transcript with the events that follow it. Items no event touched stay
// the same objects, so only what changed renders again.
export const appendEvents = (
	before: Transcript,
	events: readonly AgentEvent[],
): Transcript => {
	const draft: Draft = { ...before, items: [...before.items] };
	for (const event of events) apply(draft, event);
	return draft;
};
