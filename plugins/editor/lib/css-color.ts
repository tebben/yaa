const hex = (value: number) => Math.round(value).toString(16).padStart(2, "0");

// A token's colour, `#rrggbb` or `rgba(r, g, b, a)`, as the `#rrggbb` or
// `#rrggbbaa` Monaco takes.
export const hexColor = (color: string): string => {
	const text = color.trim().toLowerCase();
	if (/^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/.test(text)) return text;
	const parts = /^rgba?\(([^)]*)\)$/.exec(text)?.[1]?.split(",").map(Number);
	const [red, green, blue, alpha] = parts ?? [];
	if (
		red === undefined ||
		green === undefined ||
		blue === undefined ||
		parts?.some(Number.isNaN)
	) {
		throw new Error(`Not a colour the editor can use: ${color}`);
	}
	const opacity = alpha === undefined ? "" : hex(alpha * 255);
	return `#${hex(red)}${hex(green)}${hex(blue)}${opacity}`;
};
