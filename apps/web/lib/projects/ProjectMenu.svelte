<script lang="ts">
import Plus from "@lucide/svelte/icons/plus";
import Search from "@lucide/svelte/icons/search";
import { Icon, IconButton, Kbd } from "@yaa/ui";
import ProjectTree from "./ProjectTree.svelte";
import type { ProjectsController } from "./projects.svelte.ts";

// The left menu's content: the add button, the search field, and the
// project tree it filters.
let {
	projects,
	addShortcut,
	searchShortcut,
}: {
	projects: ProjectsController;
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
		class="mx-3 mt-1 mb-2 flex h-control items-center gap-2 rounded-control border border-border-strong bg-raised px-2 focus-within:outline-1 focus-within:outline-focus"
		onsubmit={(event) => {
			event.preventDefault();
			projects.focusTree();
		}}
	>
		<Icon icon={Search} class="size-3.5 text-text-muted" />
		<input
			class="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-muted"
			placeholder="Search"
			aria-label="Search projects"
			spellcheck="false"
			bind:value={() => projects.query, (text) => (projects.query = text)}
			{@attach projects.searchField}
		>
		{#if searchShortcut && projects.query === ""}
			<Kbd keys={searchShortcut} />
		{/if}
	</form>
</search>
<div class="min-h-0 flex-1 overflow-y-auto">
	<ProjectTree
		tree={projects.tree}
		selected={projects.selection}
		isExpanded={projects.isExpanded}
		list={projects.treeList}
		onselect={projects.select}
		ontoggle={projects.toggle}
		onremove={projects.remove}
	/>
	{#if projects.projects.length === 0}
		<p class="px-3 py-1 text-text-muted">No projects yet.</p>
	{:else if projects.tree.length === 0}
		<p class="px-3 py-1 text-text-muted">Nothing matches.</p>
	{/if}
</div>
