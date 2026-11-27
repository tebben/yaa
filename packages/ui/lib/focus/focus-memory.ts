import type { Attachment } from "svelte/attachments";
import { arrive, isEditable } from "./text-field.ts";

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

// The element if it is still in the container.
const within = (container: HTMLElement, element: HTMLElement | undefined) =>
	element?.isConnected === true && container.contains(element)
		? element
		: undefined;

// Remembers, per container, the item inside it that last had focus, so
// focus coming back to the container lands there: a shell region or a dock
// panel (docs/spec/01-ui-layout-theming.md). It also remembers the text
// field that last had focus, for keys that go back to editing.
export const createFocusMemory = () => {
	const last = new WeakMap<HTMLElement, HTMLElement>();
	const lastField = new WeakMap<HTMLElement, HTMLElement>();

	// The text field focus last had in the container, or else its first.
	const field = (container: HTMLElement) =>
		within(container, lastField.get(container)) ??
		focusableItems(container).find(isEditable);

	return {
		// Records focus moving onto an item of the container; the container
		// itself, focused when it has no items or by a click on its
		// background, is not an item.
		track: ((container) => {
			const remember = (event: FocusEvent) => {
				const { target } = event;
				if (target instanceof HTMLElement && target !== container) {
					last.set(container, target);
					if (isEditable(target)) lastField.set(container, target);
				}
			};
			container.addEventListener("focusin", remember);
			return () => container.removeEventListener("focusin", remember);
		}) satisfies Attachment<HTMLElement>,
		// Focuses the item that had focus last, or else the first item, or else
		// the container. A text field it lands on is parked: arriving is not
		// editing.
		enter(container: HTMLElement, options?: FocusOptions) {
			arrive(
				within(container, last.get(container)) ??
					focusableItems(container)[0] ??
					container,
				options,
			);
		},
		hasField(container: HTMLElement) {
			return field(container) !== undefined;
		},
		// Focuses the text field the container had last, or its first, to edit
		// it.
		edit(container: HTMLElement) {
			field(container)?.focus({ focusVisible: true });
		},
	};
};

export type FocusMemory = ReturnType<typeof createFocusMemory>;
