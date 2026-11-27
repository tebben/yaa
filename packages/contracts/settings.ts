import * as z from "zod";
import { fileProblem } from "./file-problem.ts";
import {
	booleanSetting,
	choiceSetting,
	colorSetting,
	listSetting,
	numberSetting,
	textSetting,
} from "./lib/settings/setting-spec.ts";

export {
	type SettingSpec,
	settingSchema,
	settingSpec,
	settingSpecs,
} from "./lib/settings/setting-spec.ts";

// One schema per setting, keyed `namespace.name`. The schema carries the
// default, which a missing or rejected value falls back to.
export type SettingDefinitions = Record<string, z.ZodDefault>;

// The settings core defines; plugin settings join these with the settings
// contribution point. The worktree settings are app-wide until the project
// layer arrives (M6, docs/spec/11-platform-services.md). The appearance
// defaults are the dark theme's tokens (docs/design/tokens.json).
export const coreSettings = {
	"appearance.customAccent": booleanSetting({
		title: "Custom accent colour",
		description: "Use your own colour in place of the theme's accent.",
		default: false,
	}),
	"appearance.accent": colorSetting({
		title: "Accent colour",
		description: "Selections, the cursor and the focus edge follow it.",
		default: "#8f9dff",
		enabledBy: "appearance.customAccent",
	}),
	"appearance.textSize": numberSetting({
		title: "Text size",
		description: "Scales the text of the whole app.",
		default: 100,
		min: 85,
		max: 120,
		step: 5,
		unit: "%",
	}),
	"appearance.uiFont": textSetting({
		title: "Interface font",
		description: "A font family installed on this computer.",
		default: "",
		placeholder: "Geist",
	}),
	"appearance.codeFont": textSetting({
		title: "Code font",
		description:
			"Branch names, paths and code; the editor and terminal follow it unless they set their own.",
		default: "",
		placeholder: "Geist Mono",
	}),
	"appearance.panelGap": numberSetting({
		title: "Panel spacing",
		description: "The gap between panels. 0 puts them edge to edge.",
		default: 8,
		min: 0,
		max: 24,
		step: 2,
		unit: "px",
	}),
	"appearance.panelRadius": numberSetting({
		title: "Panel rounding",
		description: "The radius of the panels' corners. 0 makes them square.",
		default: 8,
		min: 0,
		max: 16,
		step: 2,
		unit: "px",
	}),
	"appearance.focusEdge": choiceSetting({
		title: "Focus edge",
		description: "How the focused panel is marked after a key moves focus.",
		default: "border",
		options: [
			{ value: "border", label: "Border" },
			{ value: "top", label: "Top line" },
		],
	}),
	"appearance.menuWidth": numberSetting({
		title: "Left menu width",
		default: 248,
		min: 200,
		max: 400,
		step: 8,
		unit: "px",
	}),
	// Where new worktrees go, as <directory>/<project>/<worktree>; a leading
	// ~ is the home folder (docs/decisions/0010-worktree-location.md).
	"worktree.directory": textSetting({
		title: "Worktree folder",
		description:
			"New worktrees go in <folder>/<project>/<worktree>. A leading ~ is your home folder.",
		default: "~/.local/share/yaa/worktrees",
		required: true,
		mono: true,
	}),
	// The branch name of a new worktree (docs/spec/02-worktrees.md).
	"worktree.branchTemplate": textSetting({
		title: "Branch name template",
		description:
			"The name of a new worktree's branch, from {ticketId} and {slug}.",
		default: "{ticketId}-{slug}",
		required: true,
		mono: true,
	}),
	// Put before a bare ticket number, such as "PROJ-".
	"worktree.ticketPrefix": textSetting({
		title: "Ticket prefix",
		description: "Put before a ticket number typed on its own, such as PROJ-.",
		default: "",
		placeholder: "None",
		mono: true,
	}),
	// The keys a terminal gives up to the app while it has focus; every other
	// key goes to its program (docs/spec/01-ui-layout-theming.md).
	"keyboard.terminalAppKeys": listSetting({
		title: "Keys the terminal gives up",
		description:
			"While a terminal has focus, these keys go to the app; every other key goes to the program in it.",
		placeholder: "ctrl+shift+p",
		mono: true,
		default: [
			"ctrl+shift+p",
			"ctrl+h",
			"ctrl+j",
			"ctrl+k",
			"ctrl+l",
			"ctrl+shift+h",
			"ctrl+shift+j",
			"ctrl+shift+k",
			"ctrl+shift+l",
			"ctrl+shift+f",
			"ctrl+shift+n",
			"alt+j",
			"alt+k",
			"alt+a",
			"ctrl+`",
			"ctrl+shift+~",
			"ctrl+shift+w",
			"ctrl+shift+c",
			"ctrl+pageup",
			"ctrl+pagedown",
		],
	}),
} satisfies SettingDefinitions;

export type CoreSettings = z.infer<z.ZodObject<typeof coreSettings>>;

// A titled part of a settings section, listing its settings by key.
export type SettingsGroup = { title: string; keys: readonly string[] };

// A page of the settings screen. Plugins add one each with their settings
// contribution.
export type SettingsSection = {
	id: string;
	title: string;
	description: string;
	groups: readonly SettingsGroup[];
};

// Core's pages, in the order the settings screen lists them.
export const coreSettingsSections: readonly SettingsSection[] = [
	{
		id: "appearance",
		title: "Appearance",
		description: "Colour, text and the layout of the panels.",
		groups: [
			{
				title: "Colour",
				keys: ["appearance.customAccent", "appearance.accent"],
			},
			{
				title: "Text",
				keys: [
					"appearance.textSize",
					"appearance.uiFont",
					"appearance.codeFont",
				],
			},
			{
				title: "Layout",
				keys: [
					"appearance.panelGap",
					"appearance.panelRadius",
					"appearance.focusEdge",
					"appearance.menuWidth",
				],
			},
		],
	},
	{
		id: "worktrees",
		title: "Worktrees",
		description: "Where new worktrees go and how their branches are named.",
		groups: [
			{
				title: "New worktrees",
				keys: [
					"worktree.directory",
					"worktree.branchTemplate",
					"worktree.ticketPrefix",
				],
			},
		],
	},
	{
		id: "keyboard",
		title: "Keyboard",
		description:
			"Keys are bound in keybindings.json, next to settings.json in the app's config folder.",
		groups: [{ title: "Terminal", keys: ["keyboard.terminalAppKeys"] }],
	},
];

// settings.json as core resolved it, sent to clients.
export const settingsState = z.object({
	values: z.record(z.string(), z.unknown()),
	problems: z.array(fileProblem),
});

export type SettingsState = z.infer<typeof settingsState>;

// A change from the settings page: the value, or the default to take the
// setting out of the file.
export const settingChange = z.object({ key: z.string(), value: z.unknown() });

export type SettingChange = z.infer<typeof settingChange>;
