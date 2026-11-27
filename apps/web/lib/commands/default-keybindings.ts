import type { Keybinding } from "@yaa/contracts/keybindings";

// A letter, with or without Shift, types in an input.
const IN_DOCK = "focus.region == dock && !inputFocus";
const VERTICAL_LIST = "focus.list == vertical && !inputFocus";
const HORIZONTAL_LIST = "focus.list == horizontal && !inputFocus";

// The app's default keys; keybindings.json overrides them
// (docs/spec/11-platform-services.md).
export const defaultKeybindings: readonly Keybinding[] = [
	{ key: "ctrl+shift+p", command: "palette.open" },
	{ key: "escape", command: "palette.close" },
	{
		key: "escape",
		command: "menu.leaveSearch",
		when: "focus.region == menu && inputFocus",
	},
	// Escape parks a text field: focus stays, keys such as J and K act
	// again. Enter on a parked field, or I, edits it.
	{
		key: "escape",
		command: "input.leave",
		when: "textField",
	},
	{ key: "i", command: "input.edit", when: "!inputFocus" },
	{
		key: "enter",
		command: "input.edit",
		when: "focus.parked",
	},
	{
		key: "escape",
		command: "focus.hideHighlight",
		when: "focus.highlight",
	},
	{ key: "arrowdown", command: "palette.next" },
	{ key: "arrowup", command: "palette.previous" },
	{ key: "ctrl+j", command: "palette.next" },
	{ key: "ctrl+k", command: "palette.previous" },
	{ key: "ctrl+n", command: "palette.next" },
	{ key: "ctrl+p", command: "palette.previous" },
	{ key: "enter", command: "palette.run" },
	{ key: "ctrl+b", command: "menu.toggle" },
	{ key: "ctrl+,", command: "settings.open" },
	{ key: "ctrl+,", command: "settings.close" },
	// A panel keeps / for itself, such as to search in it.
	{
		key: "/",
		command: "menu.search",
		when: "(focus.region != dock || !panel.kind) && !inputFocus",
	},
	{ key: "ctrl+shift+n", command: "worktree.new" },
	{ key: "alt+j", command: "worktree.next" },
	{ key: "alt+k", command: "worktree.previous" },
	{ key: "alt+a", command: "worktree.nextAttention" },
	{ key: "ctrl+h", command: "focus.left" },
	{ key: "ctrl+j", command: "focus.down" },
	{ key: "ctrl+k", command: "focus.up" },
	{ key: "ctrl+l", command: "focus.right" },
	{ key: "j", command: "list.next", when: VERTICAL_LIST },
	{ key: "k", command: "list.previous", when: VERTICAL_LIST },
	{ key: "l", command: "list.next", when: HORIZONTAL_LIST },
	{ key: "h", command: "list.previous", when: HORIZONTAL_LIST },
	{ key: "shift+h", command: "tab.previous", when: IN_DOCK },
	{ key: "shift+k", command: "tab.previous", when: IN_DOCK },
	{ key: "shift+l", command: "tab.next", when: IN_DOCK },
	{ key: "shift+j", command: "tab.next", when: IN_DOCK },
	{ key: "ctrl+shift+h", command: "panel.narrower" },
	{ key: "ctrl+shift+j", command: "panel.taller" },
	{ key: "ctrl+shift+k", command: "panel.shorter" },
	{ key: "ctrl+shift+l", command: "panel.wider" },
	{ key: "ctrl+w", command: "panel.close", when: IN_DOCK },
	{
		key: "ctrl+shift+f",
		command: "panel.fullScreen",
		when: "focus.region == dock",
	},
];
