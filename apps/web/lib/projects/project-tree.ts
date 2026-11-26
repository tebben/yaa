import { fuzzyScore } from "@yaa/commands/fuzzy-match";
import type { Project, Worktree } from "@yaa/contracts/projects";

// A project as the tree shows it, with the worktrees under it: the main
// checkout first.
export type TreeProject = { project: Project; worktrees: readonly Worktree[] };

const matches = (query: string, text: string) =>
	fuzzyScore(query, text) !== undefined;

// The tree for the search query, in list order: a project whose name
// matches keeps all its worktrees; otherwise it stays only for the
// worktrees whose branch matches. An empty query keeps everything.
export const filterTree = (
	query: string,
	projects: readonly Project[],
): TreeProject[] =>
	projects.flatMap((project) => {
		if (matches(query, project.name)) {
			return [{ project, worktrees: project.worktrees }];
		}
		const worktrees = project.worktrees.filter(({ branch }) =>
			matches(query, branch),
		);
		return worktrees.length > 0 ? [{ project, worktrees }] : [];
	});

// Where the grid is: a project's overview, or one of its worktrees.
export type Place = { project: string; worktree?: string };

// The worktree `step` places from `current` in tree order, every project's
// worktrees included, wrapping around; from an overview, the project's
// first or last worktree.
export const stepWorktree = (
	projects: readonly Project[],
	current: Place | undefined,
	step: 1 | -1,
): Place | undefined => {
	const all = projects.flatMap(({ id, worktrees }) =>
		worktrees.map((worktree) => ({ project: id, worktree: worktree.id })),
	);
	if (all.length === 0) return undefined;
	const at = all.findIndex(({ worktree }) => worktree === current?.worktree);
	if (at >= 0) return all[(at + step + all.length) % all.length];
	const first = all.findIndex(({ project }) => project === current?.project);
	if (first < 0) return step === 1 ? all[0] : all[all.length - 1];
	const count = all.filter(
		({ project }) => project === current?.project,
	).length;
	return all[step === 1 ? first : first + count - 1];
};
