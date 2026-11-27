<script lang="ts">
import type { Snippet } from "svelte";
import type { Attachment } from "svelte/attachments";

// The left menu's frame; the project list or the settings pages fill it. `region` makes it a
// place keyboard focus can move to. The header holds the button that hides
// and shows it. `label` names what it lists.
let {
	region,
	label,
	children,
}: {
	region: Attachment<HTMLElement>;
	label: string;
	children: Snippet;
} = $props();
</script>

<nav
	class="yaa-focus-region col-start-1 row-start-2 flex min-h-0 w-menu flex-col border-r border-border bg-menu py-2"
	aria-label={label}
	{@attach region}
>
	{@render children()}
</nav>
