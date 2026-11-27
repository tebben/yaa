// The settings and the settings screen (docs/spec/11-platform-services.md).

export { default as SettingsMenu } from "./SettingsMenu.svelte";
export { default as SettingsScreen } from "./SettingsScreen.svelte";
export {
	createSettings,
	type SettingsController,
	type SettingsValues,
} from "./settings.svelte.ts";
export { settingsCommands } from "./settings-commands.ts";
