import { coreSettings, coreSettingsSections } from "@yaa/contracts/settings";
import { tokenValues } from "@yaa/ui/tokens";
import { describe, expect, it } from "vitest";
import * as z from "zod";
import {
	appearanceVariables,
	corePages,
	mixColors,
	searchSettings,
} from "../settings.ts";

const defaults = z.object(coreSettings).parse({});
const pages = corePages(coreSettingsSections, coreSettings);

describe("appearanceVariables", () => {
	it("gives the theme's own tokens for the defaults", () => {
		const variables = appearanceVariables(defaults);
		const tokens = new Map(Object.entries(tokenValues));
		for (const [name, value] of Object.entries(variables)) {
			if (tokens.has(name)) expect(value, name).toBe(tokens.get(name));
		}
		expect(variables["dock-separator"]).toBe("transparent");
		expect(variables["color-accent"]).toBeUndefined();
		expect(variables["font-sans"]).toBeUndefined();
	});

	it("derives the accent's shades as the theme's are", () => {
		const channels = (hex: string | undefined) =>
			[1, 3, 5].map((at) => Number.parseInt(hex?.slice(at, at + 2) ?? "", 16));
		const theme = appearanceVariables({
			...defaults,
			"appearance.customAccent": true,
		});
		for (const name of ["color-accent-soft", "color-focus"] as const) {
			const want = channels(tokenValues[name]);
			channels(theme[name]).forEach((channel, index) => {
				expect(Math.abs(channel - (want[index] ?? 0)), name).toBeLessThan(16);
			});
		}
		expect(mixColors("#ffffff", "#000000", 0.5)).toBe("#808080");
		const variables = appearanceVariables({
			...defaults,
			"appearance.customAccent": true,
			"appearance.accent": "#ff8800",
		});
		expect(variables["color-accent"]).toBe("#ff8800");
		expect(variables["color-focus"]).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("scales the text, sets fonts before the theme's and drops the side edges", () => {
		const variables = appearanceVariables({
			...defaults,
			"appearance.textSize": 110,
			"appearance.codeFont": "JetBrains Mono",
			"appearance.focusEdge": "top",
		});
		expect(variables["text-sm"]).toBe("15.4px");
		expect(variables["font-mono"]).toBe(
			`"JetBrains Mono", ${tokenValues["font-mono"]}`,
		);
		expect(variables["spacing-focus-side"]).toBe("0px");
	});
});

describe("searchSettings", () => {
	it("keeps the settings holding every word, in their pages and groups", () => {
		const found = searchSettings(pages, "panel round");
		expect(found.map(({ id }) => id)).toEqual(["appearance"]);
		expect(found[0]?.groups.flatMap(({ settings }) => settings)).toEqual([
			expect.objectContaining({ key: "appearance.panelRadius" }),
		]);
	});

	it("matches a page's title and leaves out pages without a match", () => {
		const found = searchSettings(pages, "worktrees");
		expect(found.map(({ id }) => id)).toEqual(["worktrees"]);
		expect(searchSettings(pages, "nothing like this")).toEqual([]);
	});
});
