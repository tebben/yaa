<script lang="ts">
// Core info for the selected project and plugin chips come in M2; until then
// the footer reports when the core cannot be reached.
let { error }: { error: string | undefined } = $props();
</script>

<footer
	class="col-start-2 flex h-footer items-center border-t border-border bg-chrome px-3 text-sm"
>
	{#if error}
		<span class="truncate text-state-error">Core unreachable: {error}</span>
	{/if}
</footer>
