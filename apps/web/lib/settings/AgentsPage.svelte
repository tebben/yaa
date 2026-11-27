<script lang="ts">
import { onMount } from "svelte";
import AgentCard from "./AgentCard.svelte";
import type { AgentsController } from "./agents.svelte.ts";

// Every agent yaa supports, each checked anew when the page opens.
let { agents }: { agents: AgentsController } = $props();

onMount(() => agents.checkAll());
</script>

{#each agents.listed as agent (agent.id)}
	<AgentCard
		{agent}
		report={agents.report(agent.id)}
		checking={agents.checking(agent.id)}
		oncheck={() => agents.check(agent.id)}
	/>
{:else}
	<p class="text-text-muted">No agent provider is installed.</p>
{/each}
