import type { Keybinding } from "@yaa/contracts/keybindings";

// Shift with a letter types a capital in an input, and the palette's arrows
// and Enter belong to it while it is open.
const NOT_IN_PALETTE = "!palette.open";
const NOT_TYPING = "!inputFocus && !palette.open";

// The app's default keys; keybindings.json overrides them
// (docs/spec/11-platform-services.md).
export const defaultKeybindings: readonly Keybinding[] = [
	{ key: "ctrl+shift+p", command: "palette.open" },
	{ key: "escape", command: "palette.close", when: "palette.open" },
	{ key: "arrowdown", command: "palette.next", when: "palette.open" },
	{ key: "arrowup", command: "palette.previous", when: "palette.open" },
	{ key: "enter", command: "palette.run", when: "palette.open" },
	{ key: "ctrl+b", command: "menu.toggle", when: NOT_IN_PALETTE },
	{ key: "ctrl+h", command: "panel.focusLeft", when: NOT_IN_PALETTE },
	{ key: "ctrl+j", command: "panel.focusDown", when: NOT_IN_PALETTE },
	{ key: "ctrl+k", command: "panel.focusUp", when: NOT_IN_PALETTE },
	{ key: "ctrl+l", command: "panel.focusRight", when: NOT_IN_PALETTE },
	{ key: "shift+h", command: "tab.previous", when: NOT_TYPING },
	{ key: "shift+k", command: "tab.previous", when: NOT_TYPING },
	{ key: "shift+l", command: "tab.next", when: NOT_TYPING },
	{ key: "shift+j", command: "tab.next", when: NOT_TYPING },
	{ key: "ctrl+shift+h", command: "panel.narrower", when: NOT_IN_PALETTE },
	{ key: "ctrl+shift+j", command: "panel.taller", when: NOT_IN_PALETTE },
	{ key: "ctrl+shift+k", command: "panel.shorter", when: NOT_IN_PALETTE },
	{ key: "ctrl+shift+l", command: "panel.wider", when: NOT_IN_PALETTE },
	{ key: "ctrl+w", command: "panel.close", when: NOT_IN_PALETTE },
];
