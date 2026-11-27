import { describe, expect, it } from "vitest";
import {
	pluginManifest,
	pluginSettingDefinitions,
} from "../plugin-manifest.ts";
import {
	coreSettings,
	coreSettingsSections,
	settingSpec,
	settingSpecs,
} from "../settings.ts";

const withSettings = (settings: Record<string, unknown>) => ({
	id: "editor",
	version: "0.1.0",
	contributes: {
		settings: {
			title: "Editor",
			description: "The editor.",
			groups: [{ title: "Text", settings }],
		},
	},
});

const messages = (manifest: unknown) => {
	const result = pluginManifest.safeParse(manifest);
	return result.success
		? []
		: result.error.issues.map(({ message }) => message);
};

const fontSize = {
	type: "number",
	title: "Font size",
	default: 14,
	min: 8,
	max: 32,
	step: 1,
};

describe("setting specs", () => {
	it("rejects a default outside the range or the options", () => {
		expect(settingSpec.safeParse({ ...fontSize, default: 40 }).success).toBe(
			false,
		);
		const choice = {
			type: "choice",
			title: "Wrap",
			default: "maybe",
			options: [{ value: "on", label: "On" }],
		};
		expect(settingSpec.safeParse(choice).success).toBe(false);
	});

	it("gives every core setting in a section a spec, and every core setting a section", () => {
		const listed = coreSettingsSections.flatMap(({ groups }) =>
			groups.flatMap(({ keys }) => keys),
		);
		expect([...listed].sort()).toEqual(Object.keys(coreSettings).sort());
		for (const schema of Object.values(coreSettings)) {
			expect(settingSpecs.get(schema)).toBeDefined();
		}
	});
});

describe("plugin settings", () => {
	it("checks a contributed setting's value with its spec", () => {
		const manifest = pluginManifest.parse(
			withSettings({ "editor.fontSize": fontSize }),
		);
		const schema = pluginSettingDefinitions(manifest)["editor.fontSize"];
		expect(schema?.parse(undefined)).toBe(14);
		expect(schema?.safeParse(40).success).toBe(false);
		expect(schema && settingSpecs.get(schema)?.title).toBe("Font size");
	});

	it("requires keys in the plugin's namespace, and not core's", () => {
		expect(messages(withSettings({ "other.size": fontSize }))).toEqual([
			"Expected editor.<name>",
		]);
	});

	it("requires the switch a setting waits for in the same group", () => {
		expect(
			messages(
				withSettings({ "editor.fontSize": { ...fontSize, enabledBy: "x" } }),
			),
		).toEqual(["Expected a setting of this group"]);
	});
});
