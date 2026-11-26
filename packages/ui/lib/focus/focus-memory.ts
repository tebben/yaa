import type { Attachment } from "svelte/attachments";

// An element with tabindex -1 is for the mouse only, such as a tree's
// chevron: keys skip it.
const FOCUSABLE = [
	"button:not(:disabled)",
	"a[href]",
	"input:not(:disabled)",
	"select:not(:disabled)",
	"textarea:not(:disabled)",
	"[tabindex]",
]
	.map((selector) => `${selector}:not([tabindex="-1"])`)
	.join(", ");

// The items keyboard focus can land on inside the container, in page order.
export const focusableItems = (container: HTMLElement): HTMLElement[] => [
	...container.querySelectorAll<HTMLElement>(FOCUSABLE),
];

// Remembers, per container, the item inside it that last had focus, so
// focus coming back to the container lands there: a shell region or a dock
// panel (docs/spec/01-ui-layout-theming.md).
export const createFocusMemory = () => {
	const last = new WeakMap<HTMLElement, HTMLElement>();

	return {
		// Records focus moving onto an item of the container; the container
		// itself, focused when it has no items or by a click on its
		// background, is not an item.
		track: ((container) => {
			const remember = (event: FocusEvent) => {
				const { target } = event;
				if (target instanceof HTMLElement && target !== container) {
					last.set(container, target);
				}
			};
			container.addEventListener("focusin", remember);
			return () => container.removeEventListener("focusin", remember);
		}) satisfies Attachment<HTMLElement>,
		// Focuses the item that had focus last, or else the first item, or else
		// the container.
		enter(container: HTMLElement, options?: FocusOptions) {
			const item = last.get(container);
			const remembered =
				item?.isConnected === true && container.contains(item)
					? item
					: undefined;
			(remembered ?? focusableItems(container)[0] ?? container).focus(options);
		},
	};
};

export type FocusMemory = ReturnType<typeof createFocusMemory>;
