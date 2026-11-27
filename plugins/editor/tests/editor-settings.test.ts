import { pluginManifest } from "@yaa/contracts/plugin-manifest";
import { describe, expect, it } from "vitest";
import { editorSettings } from "../editor-options.ts";
import manifest from "../plugin.json" with { type: "json" };

describe("editor settings", () => {
	it("reads every setting plugin.json declares, from its defaults", () => {
		const { contributes } = pluginManifest.parse(manifest);
		const defaults = Object.fromEntries(
			(contributes.settings?.groups ?? []).flatMap(({ settings }) =>
				Object.entries(settings).map(([key, spec]) => [key, spec.default]),
			),
		);
		expect(editorSettings.strict().safeParse(defaults).success).toBe(true);
		for (const { settings } of contributes.settings?.groups ?? []) {
			for (const [key, spec] of Object.entries(settings)) {
				if (spec.type !== "choice") continue;
				for (const { value } of spec.options) {
					const chosen = { ...defaults, [key]: value };
					expect(editorSettings.safeParse(chosen).success, value).toBe(true);
				}
			}
		}
	});
});
