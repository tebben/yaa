import type { Keybinding } from "@yaa/contracts/keybindings";

// The palette's arrows and Enter belong to it while it is open. A letter,
// with or without Shift, types in an input.
const NOT_IN_PALETTE = "!palette.open";
const IN_DOCK = "focus.region == dock && !inputFocus && !palette.open";
const VERTICAL_LIST = "focus.list == vertical && !inputFocus";
const HORIZONTAL_LIST = "focus.list == horizontal && !inputFocus";

// The app's default keys; keybindings.json overrides them
// (docs/spec/11-platform-services.md).
export const defaultKeybindings: readonly Keybinding[] = [
	{ key: "ctrl+shift+p", command: "palette.open" },
	{ key: "escape", command: "palette.close", when: "palette.open" },
	{
		key: "escape",
		command: "menu.leaveSearch",
		when: "focus.region == menu && inputFocus && !palette.open",
	},
	{
		key: "escape",
		command: "focus.hideHighlight",
		when: "focus.highlight && !palette.open",
	},
	{ key: "arrowdown", command: "palette.next", when: "palette.open" },
	{ key: "arrowup", command: "palette.previous", when: "palette.open" },
	{ key: "ctrl+j", command: "palette.next", when: "palette.open" },
	{ key: "ctrl+k", command: "palette.previous", when: "palette.open" },
	{ key: "ctrl+n", command: "palette.next", when: "palette.open" },
	{ key: "ctrl+p", command: "palette.previous", when: "palette.open" },
	{ key: "enter", command: "palette.run", when: "palette.open" },
	{ key: "ctrl+b", command: "menu.toggle", when: NOT_IN_PALETTE },
	{ key: "/", command: "menu.search", when: "!inputFocus && !palette.open" },
	{ key: "ctrl+shift+n", command: "worktree.new", when: NOT_IN_PALETTE },
	{ key: "alt+j", command: "worktree.next", when: NOT_IN_PALETTE },
	{ key: "alt+k", command: "worktree.previous", when: NOT_IN_PALETTE },
	{ key: "alt+a", command: "worktree.nextAttention", when: NOT_IN_PALETTE },
	{ key: "ctrl+h", command: "focus.left", when: NOT_IN_PALETTE },
	{ key: "ctrl+j", command: "focus.down", when: NOT_IN_PALETTE },
	{ key: "ctrl+k", command: "focus.up", when: NOT_IN_PALETTE },
	{ key: "ctrl+l", command: "focus.right", when: NOT_IN_PALETTE },
	{ key: "j", command: "list.next", when: VERTICAL_LIST },
	{ key: "k", command: "list.previous", when: VERTICAL_LIST },
	{ key: "l", command: "list.next", when: HORIZONTAL_LIST },
	{ key: "h", command: "list.previous", when: HORIZONTAL_LIST },
	{ key: "shift+h", command: "tab.previous", when: IN_DOCK },
	{ key: "shift+k", command: "tab.previous", when: IN_DOCK },
	{ key: "shift+l", command: "tab.next", when: IN_DOCK },
	{ key: "shift+j", command: "tab.next", when: IN_DOCK },
	{ key: "ctrl+shift+h", command: "panel.narrower", when: NOT_IN_PALETTE },
	{ key: "ctrl+shift+j", command: "panel.taller", when: NOT_IN_PALETTE },
	{ key: "ctrl+shift+k", command: "panel.shorter", when: NOT_IN_PALETTE },
	{ key: "ctrl+shift+l", command: "panel.wider", when: NOT_IN_PALETTE },
	{ key: "ctrl+w", command: "panel.close", when: IN_DOCK },
];
