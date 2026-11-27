// Input types that take no typed text.
const NOT_TEXT = new Set([
	"button",
	"checkbox",
	"color",
	"file",
	"hidden",
	"image",
	"radio",
	"range",
	"reset",
	"submit",
]);

const PARKED = "data-parked";

// An element keys could type into as text: a text input, a text area or
// editable content.
const takesText = (element: Element | null) =>
	(element instanceof HTMLInputElement && !NOT_TEXT.has(element.type)) ||
	element instanceof HTMLTextAreaElement ||
	(element instanceof HTMLElement && element.isContentEditable);

export const isParked = (element: Element | null) =>
	element?.hasAttribute(PARKED) === true;

// A field being edited, such as the menu's search or the chat's prompt: keys
// typed there are text, and Escape parks it (docs/spec/01-ui-layout-theming.md).
// A widget that takes the keyboard for itself, such as a terminal, captures
// keys, so Escape stays with it.
export const isTextField = (element: Element | null) =>
	takesText(element) && !isParked(element);

// Anything keys type into now: a field being edited, or an editor that takes
// text through the EditContext API, such as Monaco.
export const isTextEntry = (element: Element | null) =>
	isTextField(element) ||
	(element instanceof HTMLElement &&
		"editContext" in element &&
		Boolean(element.editContext));

// Stops editing a field while focus stays on it: a parked field takes no
// typed text, so keys such as J and K act around it. A click on it, or
// focus leaving it, ends that; `unpark` does by key. Editable content that
// is not an input or a text area cannot be parked and stays as it is.
export const park = (element: Element | null) => {
	const field =
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement
			? element
			: undefined;
	// A read-only field of its own is not ours to change.
	if (field === undefined || !takesText(field) || field.readOnly) return;
	field.readOnly = true;
	field.setAttribute(PARKED, "");
	const end = () => unpark(field);
	field.addEventListener("blur", end, { once: true });
	field.addEventListener("pointerdown", end, { once: true });
};

export const unpark = (element: Element | null) => {
	if (
		!isParked(element) ||
		!(
			element instanceof HTMLInputElement ||
			element instanceof HTMLTextAreaElement
		)
	) {
		return;
	}
	element.readOnly = false;
	element.removeAttribute(PARKED);
};

// Moves keyboard focus onto an item; a text field it lands on is parked, so
// arriving is not editing.
export const arrive = (item: HTMLElement, options?: FocusOptions) => {
	if (takesText(item)) park(item);
	item.focus(options);
};

// Moves focus onto a text field to edit it, parked or not.
export const editField = (field: HTMLElement, options?: FocusOptions) => {
	unpark(field);
	field.focus(options);
};

// Whether the element can be edited: a text field, parked or not.
export const isEditable = takesText;
