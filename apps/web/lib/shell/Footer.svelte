<script lang="ts">
import type { Attachment } from "svelte/attachments";

// Core info for the selected project and plugin chips come in M2; until then
// the footer shows the last failure, such as an unreachable core or a
// command that failed.
let {
	message,
	region,
}: { message: string | undefined; region: Attachment<HTMLElement> } = $props();
</script>

<footer
	{@attach region}
	class="yaa-focus-region col-start-2 flex h-footer items-center border-t border-border bg-chrome px-3 text-sm"
>
	{#if message}
		<span class="truncate text-state-error">{message}</span>
	{/if}
</footer>
