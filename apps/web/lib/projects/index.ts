// The project list in the left menu, its search, and the project overview
// (docs/spec/02-worktrees.md).
export { default as ProjectMenu } from "./ProjectMenu.svelte";
export { default as ProjectOverview } from "./ProjectOverview.svelte";
export { projectCommands } from "./project-commands.ts";
export {
	createProjects,
	type ProjectsController,
	type ProjectView,
} from "./projects.svelte.ts";
