import type { Command } from "../commands/index.ts";
import type { SettingsController } from "./settings.svelte.ts";

type SettingsCommandsOptions = {
	settings: SettingsController;
	// Shows the left menu, which lists the settings pages, and moves focus
	// into it once it is there.
	enterMenu(): void;
	// Moves focus back to where the app shows its projects.
	leave(): void;
};

// Opening and closing the settings screen. One key does both: each
// command holds only in its state.
export const settingsCommands = ({
	settings,
	enterMenu,
	leave,
}: SettingsCommandsOptions): Command[] => [
	{
		id: "settings.open",
		title: "Open settings",
		category: "Preferences",
		when: "!settings.open",
		run: () => {
			settings.show();
			enterMenu();
		},
	},
	{
		id: "settings.close",
		title: "Close settings",
		category: "Preferences",
		when: "settings.open",
		run: () => {
			settings.close();
			leave();
		},
	},
];
