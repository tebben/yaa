<script lang="ts">
import type { CoreInfoController } from "./core-info.svelte.ts";

let { coreInfo }: { coreInfo: CoreInfoController } = $props();
</script>

<main>
	<h1>yaa</h1>
	{#if coreInfo.info}
		<p>
			Core running on Electron {coreInfo.info.electron}, Node
			{coreInfo.info.node}, since
			{new Date(coreInfo.info.startedAt).toLocaleTimeString()}.
		</p>
	{:else if coreInfo.error}
		<p>Core unreachable: {coreInfo.error}</p>
	{:else}
		<p>Connecting to the core…</p>
	{/if}
</main>
