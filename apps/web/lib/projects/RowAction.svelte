<script lang="ts">
import { Icon, type IconSource } from "@yaa/ui";

// A small action that shows on a hovered row of the project tree. Keys reach
// the same action through the palette, so it takes no tab stop.
let {
	icon,
	label,
	onclick,
}: { icon: IconSource; label: string; onclick: () => void } = $props();
</script>

<button
	type="button"
	tabindex="-1"
	class="flex size-row shrink-0 cursor-pointer items-center justify-center rounded-control text-text-muted hover:bg-pressed hover:text-text"
	aria-label={label}
	title={label}
	{onclick}
>
	<Icon {icon} class="size-3.5" />
</button>
