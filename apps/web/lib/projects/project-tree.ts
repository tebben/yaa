import { fuzzyScore } from "@yaa/commands/fuzzy-match";
import type { Project } from "@yaa/contracts/projects";

// A project as the tree shows it, with the branches under it.
export type TreeProject = { project: Project; branches: readonly string[] };

const matches = (query: string, text: string) =>
	fuzzyScore(query, text) !== undefined;

// The tree for the search query, in list order: a project whose name
// matches keeps all its branches; otherwise it stays only for the branches
// that match. An empty query keeps everything.
export const filterTree = (
	query: string,
	projects: readonly Project[],
): TreeProject[] =>
	projects.flatMap((project) => {
		const all = [project.defaultBranch];
		if (matches(query, project.name)) return [{ project, branches: all }];
		const branches = all.filter((branch) => matches(query, branch));
		return branches.length > 0 ? [{ project, branches }] : [];
	});
