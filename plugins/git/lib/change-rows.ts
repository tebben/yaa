import type { GitChange, GitSection } from "@yaa/contracts/worktree-files";

export type ChangeRow = {
	path: string;
	label: string;
	depth: number;
	folder: boolean;
	paths: string[];
};

export const changeRows = (
	changes: readonly GitChange[],
	section: GitSection,
	tree: boolean,
): ChangeRow[] => {
	const paths = changes
		.filter((change) => change[section] !== null)
		.map((change) => change.path)
		.sort((a, b) => a.localeCompare(b));
	if (!tree) {
		return paths.map((path) => ({
			path,
			label: path,
			depth: 0,
			folder: false,
			paths: [path],
		}));
	}
	const folders = new Map<string, string[]>();
	for (const path of paths) {
		const parts = path.split("/");
		for (let at = 1; at < parts.length; at += 1) {
			const folder = parts.slice(0, at).join("/");
			const contained = folders.get(folder) ?? [];
			contained.push(path);
			folders.set(folder, contained);
		}
	}
	return [
		...paths.map((path) => ({
			path,
			label: path.split("/").at(-1) ?? path,
			depth: path.split("/").length - 1,
			folder: false,
			paths: [path],
		})),
		...[...folders].map(([path, contained]) => ({
			path,
			label: path.split("/").at(-1) ?? path,
			depth: path.split("/").length - 1,
			folder: true,
			paths: contained,
		})),
	].sort((a, b) => a.path.localeCompare(b.path));
};
