import type { Command } from "../commands/index.ts";
import type { ProjectsController } from "./projects.svelte.ts";
import type { WorktreesController } from "./worktrees.svelte.ts";

type ProjectCommandsOptions = {
	projects: ProjectsController;
	worktrees: WorktreesController;
	// Shows the left menu if it is hidden, resolving once it is on screen.
	showMenu(): Promise<void>;
	highlight(): void;
};

// The commands of the project list in the left menu and its worktrees.
export const projectCommands = ({
	projects,
	worktrees,
	showMenu,
	highlight,
}: ProjectCommandsOptions): Command[] => [
	{
		id: "project.add",
		title: "Add project",
		category: "Project",
		run: projects.add,
	},
	{
		id: "project.remove",
		title: "Remove project from the list",
		category: "Project",
		when: "project.selected",
		run: () => {
			const { selected } = projects;
			if (selected !== undefined) projects.remove(selected.id);
		},
	},
	{
		id: "worktree.new",
		title: "New worktree",
		category: "Worktree",
		when: "project.selected",
		run: () => {
			const { selected } = projects;
			if (selected !== undefined) worktrees.create(selected.id);
		},
	},
	{
		id: "worktree.newFrom",
		title: "New worktree from branch",
		category: "Worktree",
		when: "project.selected",
		run: () => {
			const { selected } = projects;
			if (selected !== undefined) worktrees.createFrom(selected.id);
		},
	},
	{
		id: "worktree.finish",
		title: "Finish worktree",
		category: "Worktree",
		when: "worktree.selected",
		run: () => {
			const { place } = projects;
			if (place?.worktree !== undefined) {
				worktrees.finish(place.project, place.worktree);
			}
		},
	},
	{
		id: "worktree.reopen",
		title: "Reopen settled worktree",
		category: "Worktree",
		run: worktrees.pickSettled,
	},
	{
		id: "worktree.markDone",
		title: "Mark worktree done",
		category: "Worktree",
		when: "worktree.selected && !worktree.done",
		run: () => {
			const { worktree } = projects;
			if (worktree !== undefined) worktrees.setDone(worktree.id, true);
		},
	},
	{
		id: "worktree.unmarkDone",
		title: "Mark worktree not done",
		category: "Worktree",
		when: "worktree.done",
		run: () => {
			const { worktree } = projects;
			if (worktree !== undefined) worktrees.setDone(worktree.id, false);
		},
	},
	{
		id: "worktree.permissionMode",
		title: "Set permission mode",
		category: "Worktree",
		when: "worktree.open",
		run: () => {
			const { worktree } = projects;
			if (worktree !== undefined) worktrees.pickPermissionMode(worktree);
		},
	},
	{
		id: "worktree.nextAttention",
		title: "Next worktree that needs attention",
		category: "Worktree",
		run: projects.nextAttention,
	},
	{
		id: "worktree.next",
		title: "Next worktree",
		category: "Worktree",
		run: () => projects.step(1),
	},
	{
		id: "worktree.previous",
		title: "Previous worktree",
		category: "Worktree",
		run: () => projects.step(-1),
	},
	{
		id: "menu.search",
		title: "Search projects",
		category: "Project",
		run: () => {
			highlight();
			showMenu().then(projects.focusSearch);
		},
	},
	// Escape in the menu's search field clears it and moves to the tree.
	{
		id: "menu.leaveSearch",
		when: "focus.region == menu && inputFocus",
		run: () => {
			projects.query = "";
			highlight();
			projects.focusTree();
		},
	},
];
