<script lang="ts">
import type { Attachment } from "svelte/attachments";

// The project list arrives with projects in M2 (docs/spec/02-worktrees.md).
// `region` makes it a place keyboard focus can move to. The header holds the
// button that hides and shows it.
let { region }: { region: Attachment<HTMLElement> } = $props();
</script>

<nav
	class="yaa-focus-region col-start-1 row-start-2 flex w-menu flex-col border-r border-border bg-menu py-2"
	aria-label="Projects"
	{@attach region}
>
	<h2 class="px-3 py-1 text-xs tracking-wide text-text-muted uppercase">
		Projects
	</h2>
	<p class="px-3 py-1 text-text-muted">No projects yet.</p>
</nav>
