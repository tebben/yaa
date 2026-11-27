<script lang="ts">
import type { Snippet } from "svelte";

let { label, children }: { label: string; children: Snippet } = $props();
</script>

<div class="ribbon" role="toolbar" aria-label={label}>
	{@render children()}
</div>

<style>
.ribbon {
	display: flex;
	align-items: center;
	gap: var(--spacing-1);
	padding: var(--spacing-1);
	border-bottom: 1px solid var(--color-border);
}
</style>
