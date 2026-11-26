import type { Attachment } from "svelte/attachments";

const CAPTURES = "data-captures-keys";

// Marks an element that takes the keyboard for itself, such as a terminal:
// while focus is inside it, only the keys the app keeps reach the commands
// (docs/spec/01-ui-layout-theming.md, Passthrough).
export const captureKeys: Attachment<HTMLElement> = (element) => {
	element.setAttribute(CAPTURES, "");
	return () => element.removeAttribute(CAPTURES);
};

export const capturesKeys = (target: EventTarget | null): boolean =>
	target instanceof Element && target.closest(`[${CAPTURES}]`) !== null;
