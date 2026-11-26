<script lang="ts">
	let { panelId }: { panelId: string } = $props();
	const fail = (id: string): string => {
		throw new Error(`broken panel ${id}`);
	};
</script>

<div>{fail(panelId)}</div>
