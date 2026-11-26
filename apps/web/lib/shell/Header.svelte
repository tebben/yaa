<script lang="ts">
import type { Attachment } from "svelte/attachments";

// Shows the selected project and worktree, with plugin slots, once projects
// arrive in M2.
let { region }: { region: Attachment<HTMLElement> } = $props();
</script>

<header
	{@attach region}
	class="yaa-focus-region col-start-2 flex h-header items-center border-b border-border bg-chrome px-3 text-text-muted"
>
	No project selected
</header>
