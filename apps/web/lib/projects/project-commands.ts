import type { Command } from "../commands/index.ts";
import type { ProjectsController } from "./projects.svelte.ts";

type ProjectCommandsOptions = {
	projects: ProjectsController;
	// Shows the left menu if it is hidden, resolving once it is on screen.
	showMenu(): Promise<void>;
	highlight(): void;
};

// The commands of the project list in the left menu.
export const projectCommands = ({
	projects,
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
