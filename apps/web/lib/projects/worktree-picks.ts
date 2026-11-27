import { fuzzyMatch } from "@yaa/commands/fuzzy-match";
import {
	type FinishAction,
	type FinishCheck,
	finishAction,
	type Project,
} from "@yaa/contracts/projects";
import { type NamingRules, worktreeName } from "@yaa/contracts/worktree-name";
import type { PaletteItem, PaletteSource } from "../palette/index.ts";

const plural = (count: number, one: string, many: string) =>
	`${count} ${count === 1 ? one : many}`;

// The branch a new worktree starts from, the default branch first.
export const branchPick = (
	branches: readonly string[],
	defaultBranch: string,
	accept: (branch: string) => void,
): PaletteSource => {
	const ordered = [
		defaultBranch,
		...branches.filter((branch) => branch !== defaultBranch),
	];
	const items = ordered.map(
		(branch): PaletteItem => ({
			id: branch,
			label: branch,
			mono: true,
			...(branch === defaultBranch ? { detail: "default" } : {}),
		}),
	);
	return {
		label: "Branch to start from",
		placeholder: "Branch to start the worktree from",
		items: (query) => fuzzyMatch(query, items, ({ label }) => label),
		empty: () => "No matching branches",
		accept: ({ id }) => accept(id),
	};
};

// The new worktree's name, shown as the branch it makes while typing.
// Starting from a branch other than the default one, an empty name checks
// that branch out instead (docs/spec/02-worktrees.md).
export const namePick = ({
	base,
	defaultBranch,
	rules,
	accept,
}: {
	base: string;
	defaultBranch: string;
	rules: NamingRules;
	accept: (text: string, branch: string) => void;
}): PaletteSource => {
	const checkout = base !== defaultBranch;
	const result = (query: string) => worktreeName(query, rules);
	return {
		label: "New worktree",
		placeholder: checkout
			? `Name or ticket id, or nothing to check out ${base}`
			: "Name or ticket id",
		items(query) {
			if (query.trim() === "") {
				return checkout
					? [
							{
								id: "checkout",
								label: base.replace(/^[^/]+\//, ""),
								mono: true,
								detail: `Check out ${base}`,
							},
						]
					: [];
			}
			const name = result(query);
			return "problem" in name
				? []
				: [
						{
							id: "create",
							label: name.branch,
							mono: true,
							detail: `New branch from ${base}`,
						},
					];
		},
		empty(query) {
			const name = result(query);
			return "problem" in name ? name.problem : "";
		},
		accept: ({ label }, query) => accept(query, label),
	};
};

// The settled worktrees of every project, to reopen one.
export const settledPick = (
	projects: readonly Project[],
	accept: (project: string, worktree: string) => void,
): PaletteSource => {
	// The project of each settled worktree, by the worktree's id.
	const owners = new Map<string, string>();
	const items = projects.flatMap((project) =>
		project.worktrees.flatMap((worktree): PaletteItem[] => {
			if (!worktree.settled) return [];
			owners.set(worktree.id, project.id);
			return [
				{
					id: worktree.id,
					label: worktree.branch,
					mono: true,
					detail: project.name,
				},
			];
		}),
	);
	return {
		label: "Reopen settled worktree",
		placeholder: "Branch of a settled worktree",
		items: (query) => fuzzyMatch(query, items, ({ label }) => label),
		empty: () => "No settled worktrees",
		accept({ id }) {
			const project = owners.get(id);
			if (project !== undefined) accept(project, id);
		},
	};
};

// What finishing this way loses; empty when nothing. Removing the folder
// loses its uncommitted changes, deleting the branch its unpushed commits.
const losses = (action: FinishAction, check: FinishCheck) => [
	...(action !== "settle" && check.changes > 0 ? ["uncommitted changes"] : []),
	...(action !== "settle" && action !== "remove" && check.unpushed > 0
		? ["unpushed commits"]
		: []),
];

// How far to finish a worktree, after what it would lose. When it would
// lose work, the choices that keep it come first, so Enter is safe; the
// ones that lose it say so and carry the override. A settled worktree is
// offered only the ways to remove it.
export const finishPick = ({
	branch,
	defaultBranch,
	settled,
	check,
	accept,
}: {
	branch: string;
	defaultBranch: string;
	settled: boolean;
	check: FinishCheck;
	accept: (action: FinishAction, force: boolean) => void;
}): PaletteSource => {
	const notes = [
		...(check.folder
			? []
			: ["The folder is gone already; finishing clears git's record of it."]),
		...(check.changes > 0
			? [
					`${plural(check.changes, "uncommitted change", "uncommitted changes")} in the folder.`,
				]
			: []),
		...(check.unpushed > 0
			? [
					`${plural(check.unpushed, "commit", "commits")} on ${branch} ${check.unpushed === 1 ? "is" : "are"} on no remote and not on ${defaultBranch}.`,
				]
			: []),
	];
	const label = (action: FinishAction, text: string) => {
		const lost = losses(action, check);
		return lost.length === 0
			? text
			: `${text}, losing the ${lost.join(" and ")}`;
	};
	const remote = check.remoteBranch?.split("/")[0];
	const removing: PaletteItem[] = [
		{
			id: "deleteBranch",
			label: label("deleteBranch", "Remove the folder and delete the branch"),
		},
		...(remote === undefined
			? []
			: [
					{
						id: "deleteRemote",
						label: label(
							"deleteRemote",
							`Remove the folder and delete the branch here and on ${remote}`,
						),
					},
				]),
		{
			id: "remove",
			label: label("remove", "Remove the folder, keep the branch"),
		},
	];
	const settle: PaletteItem[] = settled
		? []
		: [
				{
					id: "settle",
					label: "Settle it: keep the folder, branch and chats, stop what runs",
				},
			];
	const loses = check.changes > 0 || check.unpushed > 0;
	const items = loses
		? [...settle, ...removing.reverse()]
		: [...removing, ...settle];
	const title = settled ? `Remove ${branch}` : `Finish ${branch}`;
	return {
		label: title,
		placeholder: title,
		notes,
		items: (query) => fuzzyMatch(query, items, (item) => item.label),
		empty: () => "No matching choices",
		accept({ id }) {
			const action = finishAction.parse(id);
			accept(action, losses(action, check).length > 0);
		},
	};
};
