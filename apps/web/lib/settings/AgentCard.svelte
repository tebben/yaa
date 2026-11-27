<script lang="ts">
import type { AgentReport } from "@yaa/contracts/providers";
import { Button } from "@yaa/ui";
import { capabilityLabels, stateLabels } from "./agent-labels.ts";
import type { ListedAgent } from "./agents.svelte.ts";

// One agent: whether it is connected, what stands in the way, its models and
// what it supports.
let {
	agent,
	report,
	checking,
	oncheck,
}: {
	agent: ListedAgent;
	report: AgentReport | undefined;
	checking: boolean;
	oncheck: () => void;
} = $props();
</script>

<section
	class="flex flex-col gap-2 rounded-panel bg-menu p-3"
	aria-label={agent.title}
>
	<div class="flex items-center gap-3">
		<h2 class="font-medium text-text">{agent.title}</h2>
		<p
			class={[
				"flex-1 text-sm",
				report?.state === "connected" && !checking
					? "text-state-done"
					: "text-text-muted",
				report &&
					report.state !== "connected" &&
					!checking &&
					"text-state-attention",
			]}
			role="status"
		>
			{checking ? "Checking…" : report && stateLabels[report.state]}
		</p>
		<Button disabled={checking} onclick={oncheck}>Check again</Button>
	</div>
	{#if report?.state === "connected" || report?.state === "signed-out"}
		<p class="text-sm text-text-soft">
			{report.version}{report.state === "connected" && report.account
				? ` · ${report.account}`
				: ""}
		</p>
	{/if}
	{#if report?.state === "signed-out"}
		<p class="text-text-soft select-text">{report.how}</p>
	{:else if report?.state === "missing" || report?.state === "failed"}
		<p class="whitespace-pre-wrap text-text-soft select-text">
			{report.problem}
		</p>
	{:else if report?.state === "connected"}
		<h3 class="text-sm text-text-muted">Models</h3>
		<ul class="flex flex-wrap gap-1.5">
			{#each report.models as model (model.value)}
				<li
					class={[
						"rounded-control border px-2 py-0.5 text-sm",
						model.value === report.model
							? "border-border-strong bg-selection text-text"
							: "border-border text-text-soft",
					]}
					title={model.value === report.model
						? "A new chat starts on this model"
						: undefined}
				>
					{model.label}
				</li>
			{:else}
				<li class="text-sm text-text-muted">The agent offers no choice.</li>
			{/each}
		</ul>
	{/if}
	<p class="text-sm text-text-muted">
		Supports: {capabilityLabels(agent.capabilities) || "chat only"}
	</p>
</section>
