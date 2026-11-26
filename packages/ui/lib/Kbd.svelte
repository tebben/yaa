<script lang="ts">
// A key or key combination, one key cap per key: `["Ctrl", "Shift", "P"]`.
let { keys }: { keys: readonly string[] } = $props();
</script>

<span class="inline-flex shrink-0 items-center gap-1">
	{#each keys as key, index (index)}
		<kbd
			class="inline-flex h-kbd min-w-kbd items-center justify-center rounded-chip border border-b-2 border-border-strong bg-raised px-1.5 font-sans text-xs leading-none text-text-soft"
			>{key}</kbd
		>
	{/each}
</span>
