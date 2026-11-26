<script lang="ts">
import type { Attachment } from "svelte/attachments";

// The project list arrives with projects in M2 (docs/spec/02-worktrees.md).
// `region` makes it a place keyboard focus can move to.
let { region }: { region: Attachment<HTMLElement> } = $props();
</script>

<nav
	class="yaa-focus-region row-span-3 flex w-menu flex-col border-r border-border bg-chrome"
	aria-label="Projects"
	{@attach region}
>
	<div class="flex h-header shrink-0 items-center px-3">
		<h2 class="text-xs tracking-wide text-text-muted uppercase">Projects</h2>
	</div>
	<p class="px-3 py-1 text-text-muted">No projects yet.</p>
</nav>
