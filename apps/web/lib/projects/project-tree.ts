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

// Every worktree in tree order, as places.
const worktreePlaces = (projects: readonly Project[]) =>
	projects.flatMap(({ id, worktrees }) =>
		worktrees.map((worktree) => ({ project: id, worktree: worktree.id })),
	);

// The first worktree after `current` in tree order, wrapping around, that
// `wanted` accepts; `current` itself comes last. From an overview, the
// search starts at the project's first worktree.
export const nextWorktree = (
	projects: readonly Project[],
	current: Place | undefined,
	wanted: (worktree: string) => boolean,
): Place | undefined => {
	const all = worktreePlaces(projects);
	const at = all.findIndex(({ worktree }) => worktree === current?.worktree);
	const first = all.findIndex(({ project }) => project === current?.project);
	const from = at >= 0 ? at + 1 : Math.max(first, 0);
	return [...all.slice(from), ...all.slice(0, from)].find(({ worktree }) =>
		wanted(worktree),
	);
};

// The worktree `step` places from `current` in tree order, every project's
// worktrees included, wrapping around; from an overview, the project's
// first or last worktree.
export const stepWorktree = (
	projects: readonly Project[],
	current: Place | undefined,
	step: 1 | -1,
): Place | undefined => {
	const all = worktreePlaces(projects);
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
