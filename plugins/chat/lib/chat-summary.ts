import {
	currentPermissionMode,
	PERMISSION_MODE_LABELS,
	type PermissionModeMapping,
} from "@yaa/contracts/permission-modes";
import type { ConfigOption, Transcript, TranscriptItem } from "./transcript.ts";

// What a list of chats calls one: the agent's title, or what was asked
// first.
export const chatTitle = ({ title, items }: Transcript): string => {
	if (title !== undefined) return title;
	const first = items.find((item) => item.kind === "prompt");
	const line = first?.text.trim().split("\n")[0];
	return line ? line : "New chat";
};

export type ChatStatus = "idle" | "running" | "needs you" | "error";

export const chatStatus = ({ items, running }: Transcript): ChatStatus => {
	if (!running) return items.at(-1)?.kind === "error" ? "error" : "idle";
	const waiting = items.some(
		(item) =>
			(item.kind === "permission" || item.kind === "question") &&
			item.answer === undefined,
	);
	return waiting ? "needs you" : "running";
};

// The session's option of an ACP category, such as `model`.
export const configOption = (
	{ config }: Transcript,
	category: string,
): ConfigOption | undefined =>
	config.find((option) => option.category === category);

// The chosen value as the agent names it.
export const optionLabel = ({ value, choices }: ConfigOption): string =>
	choices?.find((choice) => choice.value === value)?.label ?? String(value);

// The options the agent runs with, as the chat's header names them: model,
// permission mode, effort, then the agent's mode where that is another
// option. The option that carries the permission mode is named by the mode
// it means, or as the agent names it for a mode of its own, such as
// planning.
export const optionsSummary = (
	config: readonly ConfigOption[],
	permissionModes: PermissionModeMapping | undefined,
): string[] => {
	const permission = config.find(({ id }) => id === permissionModes?.option);
	const mode =
		permissionModes && currentPermissionMode(permissionModes, config);
	const byCategory = (category: string) =>
		config.find((option) => option.category === category);
	const shown = new Set([
		byCategory("model"),
		permission,
		byCategory("thought_level"),
		byCategory("mode"),
	]);
	return [...shown].flatMap((option) => {
		if (option === undefined) return [];
		return option === permission && mode !== undefined
			? [PERMISSION_MODE_LABELS[mode]]
			: [optionLabel(option)];
	});
};

const counted = (count: number, one: string) =>
	`${count} ${one}${count === 1 ? "" : "s"}`;

// The MCP servers and skills the agent started with, as the chat's header
// counts them; nothing for a provider that lists none.
export const contextSummary = ({ context }: Transcript): string | undefined =>
	context &&
	`${context.mcpServers.length} MCP · ${counted(context.skills.length, "skill")}`;

// How a turn that did not finish ended, as the transcript says it.
export const stoppedText = (
	reason: Extract<TranscriptItem, { kind: "stopped" }>["reason"],
): string => {
	if (reason === "cancelled") return "Stopped";
	if (reason === "interrupted")
		return "Interrupted: yaa closed during the turn";
	return `Turn ended: ${reason.replaceAll("_", " ")}`;
};
