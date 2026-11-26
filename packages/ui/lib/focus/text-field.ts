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

// A field that takes typed text, such as the menu's search or the chat's
// prompt: keys typed there are text, and Escape leaves it
// (docs/spec/01-ui-layout-theming.md). A widget that takes the keyboard for
// itself, such as a terminal, captures keys, so Escape stays with it.
export const isTextField = (element: Element | null) =>
	(element instanceof HTMLInputElement && !NOT_TEXT.has(element.type)) ||
	element instanceof HTMLTextAreaElement ||
	(element instanceof HTMLElement && element.isContentEditable);

// Anything keys type into: a text field, or an editor that takes text
// through the EditContext API, such as Monaco.
export const isTextEntry = (element: Element | null) =>
	isTextField(element) ||
	(element instanceof HTMLElement &&
		"editContext" in element &&
		Boolean(element.editContext));
