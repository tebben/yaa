import Folder from "@lucide/svelte/icons/folder";
import GitBranch from "@lucide/svelte/icons/git-branch";
import LayoutGrid from "@lucide/svelte/icons/layout-grid";
import type { BranchStatus, Project } from "@yaa/contracts/projects";
import { focusableItems } from "@yaa/ui/focus";
import type { Attachment } from "svelte/attachments";
import type { CoreClient } from "../core-connection.ts";
import type { Crumb } from "../shell/index.ts";
import { filterTree } from "./project-tree.ts";

// What the grid area shows for the selected project: its overview, or its
// default branch with the dock.
export type ProjectView = "overview" | "branch";

type ProjectsOptions = {
	client: CoreClient;
	report(message: string): void;
};

const describe = (reason: unknown) =>
	reason instanceof Error ? reason.message : String(reason);

// The project list core keeps, the selection and the search over the tree
// (docs/spec/02-worktrees.md).
export const createProjects = ({ client, report }: ProjectsOptions) => {
	let projects = $state.raw<readonly Project[]>([]);
	let selection = $state.raw<{ id: string; view: ProjectView }>();
	// The status of the selected project's main checkout, once core answers.
	let status = $state.raw<{ id: string; value: BranchStatus }>();
	let query = $state("");
	let collapsed = $state.raw<ReadonlySet<string>>(new Set());

	// A removed project is no longer selected.
	const selected = $derived(
		projects.find((project) => project.id === selection?.id),
	);
	const tree = $derived(filterTree(query, projects));

	// The search field and the tree, for the keys that move between them.
	let searchField: HTMLInputElement | undefined;
	let treeList: HTMLElement | undefined;

	const fail = (reason: unknown) => report(`Projects: ${describe(reason)}`);

	client.subscribe("projects.changed", (changed) => {
		projects = changed.projects;
	});
	client.request("projects.list", {}).then((listed) => {
		projects = listed.projects;
	}, fail);

	const refreshStatus = (id: string) => {
		client.request("projects.status", { id }).then((value) => {
			if (selection?.id === id) status = { id, value };
		}, fail);
	};

	const select = (id: string, view: ProjectView) => {
		selection = { id, view };
		refreshStatus(id);
	};

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
		get selection(): { id: string; view: ProjectView } | undefined {
			return selected && selection;
		},
		get view(): ProjectView | undefined {
			return selected && selection?.view;
		},
		// The header's path: the project, then its overview or its branch.
		get crumbs(): Crumb[] {
			if (selected === undefined || selection === undefined) return [];
			const place: Crumb =
				selection.view === "overview"
					? { icon: LayoutGrid, label: "Overview" }
					: { icon: GitBranch, label: selected.defaultBranch, mono: true };
			return [{ icon: Folder, label: selected.name }, place];
		},
		get status(): BranchStatus | undefined {
			return status !== undefined && status.id === selected?.id
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
		select,
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
					else select(result.project.id, "overview");
				}, fail);
		},
	};
};

export type ProjectsController = ReturnType<typeof createProjects>;
