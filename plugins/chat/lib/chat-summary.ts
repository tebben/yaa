import type { ConfigOption, Transcript } from "./transcript.ts";

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
