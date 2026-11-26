<script lang="ts">
import GitBranch from "@lucide/svelte/icons/git-branch";
import LayoutGrid from "@lucide/svelte/icons/layout-grid";
import type { Project } from "@yaa/contracts/projects";
import { Button, Icon } from "@yaa/ui";

// The project's overview page: a placeholder until the worktree list with
// state, changes and cost, and the issue list, arrive (M4,
// docs/spec/02-worktrees.md).
let {
	project,
	onopenbranch,
}: { project: Project; onopenbranch: (worktree: string) => void } = $props();
const main = $derived(project.worktrees[0]);
</script>

<section
	class="flex size-full flex-col gap-4 overflow-y-auto rounded-panel bg-surface p-4"
	aria-label="Project overview"
>
	<header class="flex items-center gap-2">
		<Icon icon={LayoutGrid} class="size-4 text-text-muted" />
		<h1 class="text-title font-medium text-text">{project.name}</h1>
	</header>
	<dl class="grid w-fit grid-cols-[auto_auto] gap-x-4 gap-y-1">
		<dt class="text-text-muted">Folder</dt>
		<dd class="font-mono text-text-soft">{project.path}</dd>
		<dt class="text-text-muted">Default branch</dt>
		<dd class="font-mono text-text-soft">{project.defaultBranch}</dd>
	</dl>
	{#if main}
		{@const { id } = main}
		<div>
			<Button onclick={() => onopenbranch(id)}>
				<Icon icon={GitBranch} class="size-3.5" />
				Open {project.defaultBranch}
			</Button>
		</div>
	{/if}
	<p class="text-text-muted">
		Worktrees with their state, changes and cost, and the issue list, come here.
	</p>
</section>
