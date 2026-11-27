import { fuzzyScore } from "@yaa/commands/fuzzy-match";
import type { Place, Project, Worktree } from "@yaa/contracts/projects";

// A project as the tree shows it: the worktrees in use under it, the main
// checkout first, and apart from them the settled ones.
export type TreeProject = {
	project: Project;
	worktrees: readonly Worktree[];
	settled: readonly Worktree[];
};

const split = (project: Project, worktrees: readonly Worktree[]) => ({
	project,
	worktrees: worktrees.filter(({ settled }) => !settled),
	settled: worktrees.filter(({ settled }) => settled),
});

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
			return [split(project, project.worktrees)];
		}
		const worktrees = project.worktrees.filter(({ branch }) =>
			matches(query, branch),
		);
		return worktrees.length > 0 ? [split(project, worktrees)] : [];
	});

// The place if its project, and its worktree when it names one, are still
// listed, and the worktree is in use.
export const listedPlace = (
	projects: readonly Project[],
	place: Place,
): Place | undefined => {
	const project = projects.find(({ id }) => id === place.project);
	if (project === undefined) return undefined;
	if (place.worktree === undefined) return place;
	return project.worktrees.some(
		({ id, settled }) => id === place.worktree && !settled,
	)
		? place
		: undefined;
};

// Every worktree in use in tree order, as places.
const worktreePlaces = (projects: readonly Project[]) =>
	projects.flatMap(({ id, worktrees }) =>
		worktrees.flatMap((worktree) =>
			worktree.settled ? [] : [{ project: id, worktree: worktree.id }],
		),
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
