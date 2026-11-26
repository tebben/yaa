import type { Attachment } from "svelte/attachments";

// Moves the node into an element outside the component tree, and out again
// when the node goes.
export const portal =
	(target: HTMLElement): Attachment<HTMLElement> =>
	(node) => {
		target.appendChild(node);
		return () => node.remove();
	};
