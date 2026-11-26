<script lang="ts">
import type { Snippet } from "svelte";
import type { Attachment } from "svelte/attachments";

// The left menu's frame; the project list fills it. `region` makes it a
// place keyboard focus can move to. The header holds the button that hides
// and shows it.
let {
	region,
	children,
}: { region: Attachment<HTMLElement>; children: Snippet } = $props();
</script>

<nav
	class="yaa-focus-region col-start-1 row-start-2 flex min-h-0 w-menu flex-col border-r border-border bg-menu py-2"
	aria-label="Projects"
	{@attach region}
>
	{@render children()}
</nav>
