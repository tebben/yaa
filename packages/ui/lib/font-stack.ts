// A font-family value: the family set, then the fallback for glyphs it
// lacks, such as the theme's font and its icon symbols. A plain name is
// quoted; a value with quotes or commas is a list already and goes as it is.
// An empty family is the fallback alone.
export const fontStack = (family: string, fallback: string): string => {
	const set = family.trim();
	if (set === "") return fallback;
	const listed = /["',]/.test(set) ? set : `"${set}"`;
	return `${listed}, ${fallback}`;
};
