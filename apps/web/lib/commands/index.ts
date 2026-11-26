// Commands and the app's key handling (docs/spec/01-ui-layout-theming.md).
export { captureKeys } from "./capture-keys.ts";
export {
	type Command,
	type CommandsController,
	type Contribution,
	createCommands,
	type PaletteEntry,
} from "./commands.svelte.ts";
export { defaultKeybindings } from "./default-keybindings.ts";
