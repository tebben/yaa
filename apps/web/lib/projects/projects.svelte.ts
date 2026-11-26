import Folder from "@lucide/svelte/icons/folder";
import GitBranch from "@lucide/svelte/icons/git-branch";
import LayoutGrid from "@lucide/svelte/icons/layout-grid";
import type { BranchStatus, Project } from "@yaa/contracts/projects";
import type { WorktreeState } from "@yaa/contracts/worktree-state";
import { focusableItems } from "@yaa/ui/focus";
import type { Attachment } from "svelte/attachments";
import type { CoreClient } from "../core-connection.ts";
import type { Crumb } from "../shell/index.ts";
import {
	filterTree,
	nextWorktree,
	type Place,
	stepWorktree,
} from "./project-tree.ts";

type ProjectsOptions = {
	client: CoreClient;
	report(message: string): void;
	// A worktree is about to show, so its dock can load.
	opening(worktree: string): void;
	// The worktrees that exist now; the others' docks can go.
	listed(worktrees: ReadonlySet<string>): void;
};

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The project list core keeps, with each project's worktrees and their
// states, where the grid is, and the search over the tree (docs/spec/02-worktrees.md).
export const createProjects = ({
	client,
	report,
	opening,
	listed,
}: ProjectsOptions) => {
	let projects = $state.raw<readonly Project[]>([]);
	let place = $state.raw<Place>();
	// The worktrees that are not idle.
	let states = $state.raw<Partial<Record<string, WorktreeState>>>({});
	// The status of the open worktree, once core answers.
	let status = $state.raw<{ id: string; value: BranchStatus }>();
	let query = $state("");
	let collapsed = $state.raw<ReadonlySet<string>>(new Set());

	// A removed project or a finished worktree is no longer selected.
	const selected = $derived(
		projects.find((project) => project.id === place?.project),
	);
	const worktree = $derived(
		place?.worktree === undefined
			? undefined
			: selected?.worktrees.find(({ id }) => id === place?.worktree),
	);
	const tree = $derived(filterTree(query, projects));

	// The search field and the tree, for the keys that move between them.
	let searchField: HTMLInputElement | undefined;
	let treeList: HTMLElement | undefined;

	const fail = (reason: unknown) => report(`Projects: ${describe(reason)}`);

	const go = (next: Place) => {
		place = next;
		const id = next.worktree;
		if (id === undefined) return;
		opening(id);
		client.request("worktrees.status", { id }).then((value) => {
			if (place?.worktree === id) status = { id, value };
		}, fail);
	};

	const update = (next: readonly Project[]) => {
		projects = next;
		listed(
			new Set(next.flatMap(({ worktrees }) => worktrees.map(({ id }) => id))),
		);
	};

	const stateOf = (worktree: string): WorktreeState =>
		states[worktree] ?? "idle";
	client.subscribe("worktrees.statesChanged", (changed) => {
		states = changed.states;
	});
	client.request("worktrees.states", {}).then((current) => {
		states = current.states;
	}, fail);

	client.subscribe("projects.changed", (changed) => update(changed.projects));
	// Until session restore, the window opens on the first project's main
	// checkout.
	client.request("projects.list", {}).then((list) => {
		update(list.projects);
		const [first] = list.projects;
		const main = first?.worktrees[0];
		if (place === undefined && first && main) {
			go({ project: first.id, worktree: main.id });
		}
	}, fail);

	return {
		get projects() {
			return projects;
		},
		get tree() {
			return tree;
		},
		get selected() {
			return selected;
		},
		// The worktree the grid shows; undefined on an overview.
		get worktree() {
			return worktree;
		},
		get place(): Place | undefined {
			return selected && place;
		},
		get view(): "overview" | "worktree" | undefined {
			if (selected === undefined) return undefined;
			if (place?.worktree === undefined) return "overview";
			return worktree && "worktree";
		},
		// The header's path: the project, then its overview or its branch.
		get crumbs(): Crumb[] {
			if (selected === undefined) return [];
			const project: Crumb = { icon: Folder, label: selected.name };
			if (place?.worktree === undefined) {
				return [project, { icon: LayoutGrid, label: "Overview" }];
			}
			return worktree === undefined
				? [project]
				: [project, { icon: GitBranch, label: worktree.branch, mono: true }];
		},
		get status(): BranchStatus | undefined {
			return status !== undefined && status.id === worktree?.id
				? status.value
				: undefined;
		},
		get query() {
			return query;
		},
		set query(text: string) {
			query = text;
		},
		// While searching, every project shows what matched.
		isExpanded(id: string) {
			return query.trim() !== "" || !collapsed.has(id);
		},
		toggle(id: string) {
			const next = new Set(collapsed);
			if (!next.delete(id)) next.add(id);
			collapsed = next;
		},
		go,
		stateOf,
		// To the next worktree in the tree that needs attention, if one does.
		nextAttention() {
			const next = nextWorktree(
				projects,
				place,
				(id) => stateOf(id) === "attention",
			);
			if (next !== undefined) go(next);
		},
		// The next or previous worktree in the tree, across projects.
		step(by: 1 | -1) {
			const next = stepWorktree(projects, place, by);
			if (next !== undefined) go(next);
		},
		searchField: ((element: HTMLInputElement) => {
			searchField = element;
			return () => {
				searchField = undefined;
			};
		}) satisfies Attachment<HTMLInputElement>,
		treeList: ((element: HTMLElement) => {
			treeList = element;
			return () => {
				treeList = undefined;
			};
		}) satisfies Attachment<HTMLElement>,
		focusSearch() {
			searchField?.focus({ focusVisible: true });
			searchField?.select();
		},
		// The first row of the tree, or the search field when the tree is empty.
		focusTree() {
			const [first] = treeList === undefined ? [] : focusableItems(treeList);
			(first ?? searchField)?.focus({ focusVisible: true });
		},
		remove(id: string) {
			client.request("projects.remove", { id }).catch(fail);
		},
		// Asks for a folder with the system's picker and adds its repository,
		// selecting the overview; the footer says why one cannot be added.
		add() {
			client
				.request("dialog.pickFolder", {})
				.then(({ path }) =>
					path === null ? undefined : client.request("projects.add", { path }),
				)
				.then((result) => {
					if (result === undefined) return;
					if ("problem" in result) report(result.problem);
					else go({ project: result.project.id });
				}, fail);
		},
	};
};

export type ProjectsController = ReturnType<typeof createProjects>;
