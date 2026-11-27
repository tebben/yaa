import type { PluginManifest } from "@yaa/contracts/plugin-manifest";
import {
	type SettingDefinitions,
	type SettingSpec,
	type SettingsSection,
	settingSpecs,
} from "@yaa/contracts/settings";

export type ListedSetting = { key: string; spec: SettingSpec };
export type SettingsPageGroup = {
	title: string;
	settings: readonly ListedSetting[];
};

// A page of the settings screen, from core or from a plugin.
export type SettingsPage = {
	id: string;
	title: string;
	description: string;
	// The plugin that contributes it; core's pages have none.
	plugin?: { id: string; icon: string | undefined };
	groups: readonly SettingsPageGroup[];
};

// Core's pages, with each setting's spec from its schema. A key without a
// schema or a spec is left out.
export const corePages = (
	sections: readonly SettingsSection[],
	definitions: SettingDefinitions,
): SettingsPage[] =>
	sections.map(({ groups, ...section }) => ({
		...section,
		groups: groups.map(({ title, keys }) => ({
			title,
			settings: keys.flatMap((key) => {
				const schema = Object.hasOwn(definitions, key)
					? definitions[key]
					: undefined;
				const spec = schema && settingSpecs.get(schema);
				return spec === undefined ? [] : [{ key, spec }];
			}),
		})),
	}));

// One page per plugin that contributes settings, in plugin order.
export const pluginPages = (
	manifests: readonly PluginManifest[],
): SettingsPage[] =>
	manifests.flatMap(({ id, contributes: { settings } }) =>
		settings === undefined
			? []
			: [
					{
						id,
						title: settings.title,
						description: settings.description,
						plugin: { id, icon: settings.icon },
						groups: settings.groups.map(({ title, settings }) => ({
							title,
							settings: Object.entries(settings).map(([key, spec]) => ({
								key,
								spec,
							})),
						})),
					},
				],
	);

const haystack = (page: SettingsPage, group: string, setting: ListedSetting) =>
	[
		page.title,
		group,
		setting.key,
		setting.spec.title,
		setting.spec.description ?? "",
	]
		.join(" ")
		.toLowerCase();

// The settings whose page, group, key, title or description hold every
// word of the query, in their pages and groups; pages and groups with none
// are left out.
export const searchSettings = (
	pages: readonly SettingsPage[],
	query: string,
): SettingsPage[] => {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	return pages.flatMap((page) => {
		const groups = page.groups.flatMap(({ title, settings }) => {
			const found = settings.filter((setting) => {
				const text = haystack(page, title, setting);
				return words.every((word) => text.includes(word));
			});
			return found.length === 0 ? [] : [{ title, settings: found }];
		});
		return groups.length === 0 ? [] : [{ ...page, groups }];
	});
};

// Whether a value is the setting's default, so there is nothing to reset.
export const isDefault = (spec: SettingSpec, value: unknown) =>
	JSON.stringify(value) === JSON.stringify(spec.default);
