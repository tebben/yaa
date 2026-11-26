// The fields of a DOM KeyboardEvent this needs; the package has no DOM types.
type KeyEvent = {
	key: string;
	code: string;
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	metaKey: boolean;
};

const MODIFIERS = ["ctrl", "shift", "alt", "meta"];
const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta", "AltGraph"]);
const NAMED: Readonly<Record<string, string>> = { " ": "space" };

// Letters and digits by their physical key, so `shift+h` is h with shift
// held, not the H it types; other keys by name: `escape`, `arrowup`, `f5`.
const keyName = ({ key, code }: KeyEvent): string => {
	const letter = /^Key([A-Z])$/.exec(code)?.[1];
	if (letter !== undefined) return letter.toLowerCase();
	const digit = /^Digit(\d)$/.exec(code)?.[1];
	if (digit !== undefined) return digit;
	return NAMED[key] ?? key.toLowerCase();
};

// The event in keybindings.json form, `ctrl+shift+p`, or undefined while
// only modifiers are down.
export const keyFromEvent = (event: KeyEvent): string | undefined => {
	if (MODIFIER_KEYS.has(event.key)) return undefined;
	const held = [event.ctrlKey, event.shiftKey, event.altKey, event.metaKey];
	const modifiers = MODIFIERS.filter((_, index) => held[index]);
	return [...modifiers, keyName(event)].join("+");
};

// The modifiers of a keybindings.json key in the order keyFromEvent gives
// them, so `shift+ctrl+p` matches too.
export const normalizeKey = (key: string): string => {
	const parts = key.split("+");
	const name = parts.slice(-1);
	const modifiers = MODIFIERS.filter((modifier) => parts.includes(modifier));
	return [...modifiers, ...name].join("+");
};

const capitalize = (part: string) =>
	part.charAt(0).toUpperCase() + part.slice(1);

// `ctrl+shift+p` as the keys to show, `["Ctrl", "Shift", "P"]`, for
// tooltips and the palette.
export const keyParts = (key: string): string[] =>
	key.split("+").map(capitalize);
