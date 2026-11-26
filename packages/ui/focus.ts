// Keyboard focus helpers shared by the shell's regions and the dock grid.
export {
	createFocusMemory,
	type FocusMemory,
	focusableItems,
} from "./lib/focus/focus-memory.ts";
export { isTextEntry, isTextField } from "./lib/focus/text-field.ts";
