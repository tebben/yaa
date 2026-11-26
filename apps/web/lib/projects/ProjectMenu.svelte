<script lang="ts">
import Plus from "@lucide/svelte/icons/plus";
import Search from "@lucide/svelte/icons/search";
import { IconButton, Kbd, TextField } from "@yaa/ui";
import ProjectTree from "./ProjectTree.svelte";
import type { ProjectsController } from "./projects.svelte.ts";
import type { WorktreesController } from "./worktrees.svelte.ts";

// The left menu's content: the add button, the search field, and the
// project tree it filters.
let {
	projects,
	worktrees,
	addShortcut,
	searchShortcut,
}: {
	projects: ProjectsController;
	worktrees: WorktreesController;
	addShortcut: readonly string[] | undefined;
	searchShortcut: readonly string[] | undefined;
} = $props();
</script>

<div class="flex h-control items-center justify-between pr-1.5 pl-3">
	<h2 class="text-xs tracking-wide text-text-muted uppercase">Projects</h2>
	<IconButton
		icon={Plus}
		label="Add project"
		shortcut={addShortcut}
		onclick={projects.add}
	/>
</div>
<search>
	<form
		class="mx-3 mt-1 mb-2"
		onsubmit={(event) => {
			event.preventDefault();
			projects.focusTree();
		}}
	>
		<TextField
			icon={Search}
			placeholder="Search"
			aria-label="Search projects"
			bind:value={() => projects.query, (text) => (projects.query = text)}
			{@attach projects.searchField}
		>
			{#if searchShortcut && projects.query === ""}
				<Kbd keys={searchShortcut} />
			{/if}
		</TextField>
	</form>
</search>
<div class="min-h-0 flex-1 overflow-y-auto">
	<ProjectTree
		tree={projects.tree}
		place={projects.place}
		creating={worktrees.creating}
		isFinishing={worktrees.isFinishing}
		isExpanded={projects.isExpanded}
		list={projects.treeList}
		onselect={projects.go}
		ontoggle={projects.toggle}
		onremove={projects.remove}
		oncreate={worktrees.create}
		onfinish={worktrees.finish}
	/>
	{#if projects.projects.length === 0}
		<p class="px-3 py-1 text-text-muted">No projects yet.</p>
	{:else if projects.tree.length === 0}
		<p class="px-3 py-1 text-text-muted">Nothing matches.</p>
	{/if}
</div>
