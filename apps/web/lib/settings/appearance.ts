import type { CoreSettings } from "@yaa/contracts/settings";
import { fontStack } from "@yaa/ui";
import { tokenValues } from "@yaa/ui/tokens";

export type AppearanceSettings = Pick<
	CoreSettings,
	| "appearance.customAccent"
	| "appearance.accent"
	| "appearance.textSize"
	| "appearance.uiFont"
	| "appearance.codeFont"
	| "appearance.panelGap"
	| "appearance.panelRadius"
	| "appearance.focusEdge"
	| "appearance.menuWidth"
>;

const channels = (hex: string) =>
	[1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));

// `color` laid over `base` at `amount`, as #rrggbb.
export const mixColors = (color: string, base: string, amount: number) =>
	`#${channels(color)
		.map((channel, index) => {
			const under = channels(base)[index] ?? 0;
			return Math.round(under + (channel - under) * amount)
				.toString(16)
				.padStart(2, "0");
		})
		.join("")}`;

// How much of the accent the dark theme's accent-soft and focus colours
// hold over the surface; a custom accent gets its own at the same strength.
const SOFT = 0.11;
const FOCUS = 0.59;

const scaled = Object.entries(tokenValues).filter(
	([name]) => name.startsWith("text-") || name.startsWith("leading-"),
);

const px = (value: number) => `${Number(value.toFixed(2))}px`;

// The CSS variables the appearance settings set over the theme's tokens
// (docs/spec/01-ui-layout-theming.md), by name without the leading `--`.
// A setting left at "the theme's", such as an empty font, sets none.
export const appearanceVariables = (
	settings: AppearanceSettings,
): Record<string, string> => {
	const variables: Record<string, string> = {
		"spacing-panel-gap": px(settings["appearance.panelGap"]),
		// Not a token: dock.css draws a line between panels with no gap.
		"dock-separator":
			settings["appearance.panelGap"] === 0
				? "var(--color-border)"
				: "transparent",
		"radius-panel": px(settings["appearance.panelRadius"]),
		"spacing-menu": px(settings["appearance.menuWidth"]),
		"spacing-focus-side":
			settings["appearance.focusEdge"] === "top"
				? "0px"
				: tokenValues["spacing-focus-side"],
	};
	const scale = settings["appearance.textSize"] / 100;
	for (const [name, value] of scaled) {
		variables[name] = px(Number.parseFloat(value) * scale);
	}
	if (settings["appearance.uiFont"].trim() !== "") {
		variables["font-sans"] = fontStack(
			settings["appearance.uiFont"],
			tokenValues["font-sans"],
		);
	}
	if (settings["appearance.codeFont"].trim() !== "") {
		variables["font-mono"] = fontStack(
			settings["appearance.codeFont"],
			tokenValues["font-mono"],
		);
	}
	if (settings["appearance.customAccent"]) {
		const accent = settings["appearance.accent"];
		const surface = tokenValues["color-surface"];
		variables["color-accent"] = accent;
		variables["color-accent-soft"] = mixColors(accent, surface, SOFT);
		variables["color-focus"] = mixColors(accent, surface, FOCUS);
	}
	return variables;
};
