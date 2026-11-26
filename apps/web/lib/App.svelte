<script lang="ts">
import { TooltipProvider } from "@yaa/ui";
import type { CoreInfoController } from "./core-info.svelte.ts";

let { coreInfo }: { coreInfo: CoreInfoController } = $props();
</script>

<TooltipProvider>
	<main class="flex flex-col gap-2 p-4">
		<h1 class="text-title">yaa</h1>
		<p class="text-text-soft">
			{#if coreInfo.info}
				Core running on Electron {coreInfo.info.electron}, Node
				{coreInfo.info.node}, since
				{new Date(coreInfo.info.startedAt).toLocaleTimeString()}.
			{:else if coreInfo.error}
				Core unreachable: {coreInfo.error}
			{:else}
				Connecting to the core…
			{/if}
		</p>
	</main>
</TooltipProvider>
