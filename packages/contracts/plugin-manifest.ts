import * as z from "zod";
import { keybinding } from "./keybindings.ts";
import { permissionModeMapping } from "./permission-modes.ts";
import { providerCapability } from "./providers.ts";
import {
	coreSettings,
	type SettingDefinitions,
	settingSchema,
	settingSpec,
} from "./settings.ts";

// plugin.json (docs/spec/03-plugins.md). Core reads it from disk and sends it
// to the renderer, so both ends parse it with this schema.

export const pluginId = z
	.string()
	.regex(
		/^[a-z][a-z0-9-]*$/,
		"Expected lower-case letters, digits and -, starting with a letter",
	);

// A file inside the plugin folder, such as dist/ui.js.
const pluginPath = z
	.string()
	.regex(
		/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))\S+$/,
		"Expected a path inside the plugin folder",
	);

// Exact optionals, so a missing field stays missing on its way to the
// renderer's command registry.
const pluginCommand = z.strictObject({
	id: z.string(),
	// What the palette lists it as. A panel's command without one is reached
	// by its keys only.
	title: z.string().min(1).exactOptional(),
	category: z.string().min(1).exactOptional(),
	when: z.string().min(1).exactOptional(),
	// A command of one of the plugin's panels: it runs in that panel's UI,
	// while the open worktree has the panel. Without it, it runs in the
	// backend.
	panel: z.string().exactOptional(),
	// Opens the panel first when the open worktree does not have it, so the
	// command can run whenever a worktree is open.
	reveal: z.boolean().exactOptional(),
});

// A view in the grid. The icon is an SVG file in the plugin folder, so the
// rail shows it before the plugin's UI module loads.
const pluginPanel = z.strictObject({
	id: z.string(),
	title: z.string().min(1),
	icon: pluginPath,
	// Files opened from anywhere in the app go to this panel.
	opensFiles: z.boolean().exactOptional(),
});

// An agent the plugin connects: its backend module registers how to detect,
// sign in to and start it.
const pluginProvider = z.strictObject({
	id: z.string(),
	title: z.string().min(1),
	capabilities: z.array(providerCapability).default([]),
	// Without it, the agent runs in its own mode whatever the worktree's.
	permissionModes: permissionModeMapping.exactOptional(),
});

// The plugin's page of the settings screen: its settings, keyed
// `<plugin>.<name>`, in titled groups.
const pluginSettings = z.strictObject({
	title: z.string().min(1),
	description: z.string().min(1),
	icon: pluginPath.exactOptional(),
	groups: z
		.array(
			z.strictObject({
				title: z.string().min(1),
				settings: z.record(z.string(), settingSpec),
			}),
		)
		.min(1),
});

// Running a contributed command activates the plugin anyway; onStartup
// activates it when core starts.
const activationEvent = z.enum(["onStartup"]);

const contributions = z.strictObject({
	commands: z.array(pluginCommand).default([]),
	keybindings: z.array(keybinding).default([]),
	panels: z.array(pluginPanel).default([]),
	providers: z.array(pluginProvider).default([]),
	settings: pluginSettings.exactOptional(),
});

const ownId = (plugin: string, id: string) =>
	id === plugin || id.startsWith(`${plugin}.`);

export const pluginManifest = z
	.strictObject({
		id: pluginId,
		version: z
			.string()
			.regex(
				/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
				"Expected a semver version",
			),
		activationEvents: z.array(activationEvent).default([]),
		// The built backend module, run in the plugin host.
		main: pluginPath.optional(),
		// The built UI module, and the CSS the plugin build extracted from it.
		ui: pluginPath.optional(),
		styles: pluginPath.optional(),
		// The built Node module core runs as an agent process.
		agent: pluginPath.optional(),
		// Loaded in dev mode only.
		devOnly: z.boolean().optional(),
		contributes: contributions.prefault({}),
	})
	.superRefine((manifest, context) => {
		const issue = (path: (string | number)[], message: string) =>
			context.addIssue({ code: "custom", path, message });
		const { commands, keybindings, panels, providers } = manifest.contributes;
		const commandIds = new Set<string>();
		commands.forEach(({ id }, index) => {
			const path = ["contributes", "commands", index, "id"];
			if (!ownId(manifest.id, id)) {
				issue(path, `Expected ${manifest.id} or ${manifest.id}.<name>`);
			}
			if (commandIds.has(id)) issue(path, `Command ${id} is listed twice`);
			commandIds.add(id);
		});
		const panelIds = new Set<string>();
		panels.forEach(({ id }, index) => {
			const path = ["contributes", "panels", index, "id"];
			if (!ownId(manifest.id, id)) {
				issue(path, `Expected ${manifest.id} or ${manifest.id}.<name>`);
			}
			if (panelIds.has(id)) issue(path, `Panel ${id} is listed twice`);
			panelIds.add(id);
		});
		const providerIds = new Set<string>();
		providers.forEach(({ id }, index) => {
			const path = ["contributes", "providers", index, "id"];
			if (!ownId(manifest.id, id)) {
				issue(path, `Expected ${manifest.id} or ${manifest.id}.<name>`);
			}
			if (providerIds.has(id)) issue(path, `Provider ${id} is listed twice`);
			providerIds.add(id);
		});
		const settingKeys = new Set<string>();
		manifest.contributes.settings?.groups.forEach(({ settings }, group) => {
			for (const [key, spec] of Object.entries(settings)) {
				const path = [
					"contributes",
					"settings",
					"groups",
					group,
					"settings",
					key,
				];
				if (!key.startsWith(`${manifest.id}.`)) {
					issue(path, `Expected ${manifest.id}.<name>`);
				}
				if (Object.hasOwn(coreSettings, key)) {
					issue(path, `Core defines ${key}`);
				}
				if (settingKeys.has(key)) issue(path, `Setting ${key} is listed twice`);
				settingKeys.add(key);
				if (
					spec.enabledBy !== undefined &&
					!Object.hasOwn(settings, spec.enabledBy)
				) {
					issue([...path, "enabledBy"], "Expected a setting of this group");
				}
			}
		});
		keybindings.forEach(({ command }, index) => {
			if (!commandIds.has(command)) {
				issue(
					["contributes", "keybindings", index, "command"],
					"Expected a command this plugin contributes",
				);
			}
		});
		commands.forEach(({ panel, title, reveal }, index) => {
			if (panel === undefined && reveal !== undefined) {
				issue(
					["contributes", "commands", index, "reveal"],
					"Only a panel's command can reveal its panel",
				);
			}
			if (panel === undefined && title === undefined) {
				issue(
					["contributes", "commands", index, "title"],
					"A backend command needs a title",
				);
			}
			if (panel !== undefined && !panelIds.has(panel)) {
				issue(
					["contributes", "commands", index, "panel"],
					"Expected a panel this plugin contributes",
				);
			}
		});
		const inBackend = commands.some(({ panel }) => panel === undefined);
		if (inBackend && manifest.main === undefined) {
			issue(["main"], "Commands need a backend module");
		}
		if (providers.length > 0 && manifest.main === undefined) {
			issue(["main"], "Providers need a backend module");
		}
		if (manifest.agent !== undefined && providers.length === 0) {
			issue(["agent"], "An agent module belongs to a provider");
		}
		if (panels.length > 0 && manifest.ui === undefined) {
			issue(["ui"], "Panels need a UI module");
		}
		if (manifest.styles !== undefined && manifest.ui === undefined) {
			issue(["styles"], "Styles belong to a UI module");
		}
	});

export type PluginManifest = z.infer<typeof pluginManifest>;
export type PluginCommand = z.infer<typeof pluginCommand>;
export type PluginPanel = z.infer<typeof pluginPanel>;
export type PluginProvider = z.infer<typeof pluginProvider>;
export type PluginSettings = z.infer<typeof pluginSettings>;

// The schemas of the settings a plugin contributes, by key.
export const pluginSettingDefinitions = ({
	contributes,
}: PluginManifest): SettingDefinitions =>
	Object.fromEntries(
		(contributes.settings?.groups ?? []).flatMap(({ settings }) =>
			Object.entries(settings).map(
				([key, spec]) => [key, settingSchema(spec)] as const,
			),
		),
	);
