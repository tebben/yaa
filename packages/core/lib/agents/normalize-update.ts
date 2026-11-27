import type {
	SessionConfigOption,
	SessionUpdate,
	ToolCallContent,
	ToolCallLocation,
	Usage,
} from "@agentclientprotocol/sdk/unstable";
import type { AgentEvent } from "@yaa/contracts/agent-events";

type ToolOutput = NonNullable<
	Extract<AgentEvent, { type: "tool.update" }>["output"]
>[number];

// ACP marks absent fields with null as well as by leaving them out.
const present = <T>(value: T | null | undefined): T | undefined =>
	value ?? undefined;

const output = (content: ToolCallContent): ToolOutput | undefined => {
	switch (content.type) {
		case "content":
			return content.content.type === "text"
				? { type: "text", text: content.content.text }
				: undefined;
		case "diff":
			return {
				type: "diff",
				path: content.path,
				oldText: present(content.oldText),
				newText: content.newText,
			};
		case "terminal":
			return { type: "terminal", terminalId: content.terminalId };
		case "session":
			return undefined;
	}
};

const outputs = (content: ToolCallContent[] | null | undefined) =>
	content?.flatMap((item) => output(item) ?? []);

const locations = (list: ToolCallLocation[] | null | undefined) =>
	list?.map(({ path, line }) => ({ path, line: present(line) }));

type SelectOptions = Extract<
	SessionConfigOption,
	{ type: "select" }
>["options"];

// The values an option offers, each once, as its first entry names it: a value
// is what picks a choice, and Copilot CLI lists the model `auto` twice.
const choices = (options: SelectOptions) => {
	const entries = options.flatMap((entry) =>
		"group" in entry ? entry.options : [entry],
	);
	const labels = new Map<string, string>();
	for (const { value, name } of entries) {
		if (!labels.has(value)) labels.set(value, name);
	}
	return Array.from(labels, ([value, label]) => ({ value, label }));
};

const configOption = (option: SessionConfigOption) => ({
	id: option.id,
	name: option.name,
	category: present(option.category),
	value: option.currentValue,
	choices: option.type === "select" ? choices(option.options) : undefined,
});

export const configEvent = (options: SessionConfigOption[]): AgentEvent => ({
	type: "config",
	options: options.map(configOption),
});

export const turnTokens = (usage: Usage | null | undefined) =>
	usage == null
		? undefined
		: {
				input: usage.inputTokens,
				output: usage.outputTokens,
				total: usage.totalTokens,
				thought: present(usage.thoughtTokens),
				cacheRead: present(usage.cachedReadTokens),
				cacheWrite: present(usage.cachedWriteTokens),
			};

// One ACP session update as the normalized event the app sees
// (docs/spec/05-agents-chat.md), or undefined for updates the app does not
// use: the user's own message replayed, and updates for capabilities core
// does not advertise.
export const normalizeUpdate = (
	update: SessionUpdate,
): AgentEvent | undefined => {
	switch (update.sessionUpdate) {
		case "agent_message_chunk":
		case "agent_thought_chunk":
			if (update.content.type !== "text") return undefined;
			return {
				type:
					update.sessionUpdate === "agent_message_chunk"
						? "message"
						: "thinking",
				text: update.content.text,
			};
		case "tool_call":
			return {
				type: "tool.start",
				toolCallId: update.toolCallId,
				title: update.title,
				kind: update.kind,
				status: update.status ?? "pending",
				locations: locations(update.locations),
				output: outputs(update.content),
			};
		case "tool_call_update": {
			const fields = {
				toolCallId: update.toolCallId,
				title: present(update.title),
				kind: present(update.kind),
				locations: locations(update.locations),
				output: outputs(update.content),
			};
			const status = present(update.status);
			return status === "completed" || status === "failed"
				? { type: "tool.end", ...fields, status }
				: { type: "tool.update", ...fields, status };
		}
		case "plan":
			return {
				type: "plan",
				entries: update.entries.map(({ content, priority, status }) => ({
					content,
					priority,
					status,
				})),
			};
		case "available_commands_update":
			return {
				type: "commands",
				commands: update.availableCommands.map(
					({ name, description, input }) => ({
						name,
						description,
						hint: present(input?.hint),
					}),
				),
			};
		case "session_info_update":
			return update.title == null
				? undefined
				: { type: "title", title: update.title };
		case "config_option_update":
			return configEvent(update.configOptions);
		case "usage_update":
			return {
				type: "usage",
				used: update.used,
				size: update.size,
				cost:
					update.cost == null
						? undefined
						: { amount: update.cost.amount, currency: update.cost.currency },
			};
		default:
			return undefined;
	}
};
