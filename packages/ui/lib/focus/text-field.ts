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

const takesText = (element: Element | null) =>
	(element instanceof HTMLInputElement && !NOT_TEXT.has(element.type)) ||
	element instanceof HTMLTextAreaElement ||
	(element instanceof HTMLElement && element.isContentEditable);

// A field that takes typed text, such as the menu's search or the chat's
// prompt: keys typed there are text, and Escape leaves it
// (docs/spec/01-ui-layout-theming.md). A widget that keeps its own keys,
// Escape included, marks its root `data-own-keys`, such as the vim status
// line or a terminal; its fields are not text fields here.
export const isTextField = (element: Element | null) =>
	takesText(element) && element?.closest("[data-own-keys]") === null;

// Anything keys type into: a text field, a widget's field, or an editor that
// takes text through the EditContext API, such as Monaco.
export const isTextEntry = (element: Element | null) =>
	takesText(element) ||
	(element instanceof HTMLElement &&
		"editContext" in element &&
		Boolean(element.editContext));
