import { fileIconName } from "./file-icon-name.ts";

type IconSet = {
	icons: Readonly<
		Record<string, { body: string; width?: number; height?: number }>
	>;
};

// Iconify's size for an icon that names none.
const DEFAULT_SIZE = 16;

// The Catppuccin set is one large JSON file: it loads, as a chunk of its
// own, when the first file icon is drawn, and the icons show once it has.
let icons = $state.raw<IconSet["icons"]>();
let requested = false;

const load = () => {
	if (requested) return;
	requested = true;
	void import("@iconify-json/catppuccin/icons.json").then(
		(set: { default: IconSet }) => {
			icons = set.default.icons;
		},
	);
};

export type FileIconSvg = { body: string; viewBox: string };

// The SVG of the file's icon, or undefined while the set loads and for a
// file it has no icon for.
export const fileIconSvg = (path: string): FileIconSvg | undefined => {
	const name = fileIconName(path);
	if (name === undefined) return undefined;
	if (icons === undefined) {
		load();
		return undefined;
	}
	const icon = icons[name];
	if (icon === undefined) return undefined;
	const { body, width = DEFAULT_SIZE, height = DEFAULT_SIZE } = icon;
	return { body, viewBox: `0 0 ${width} ${height}` };
};
