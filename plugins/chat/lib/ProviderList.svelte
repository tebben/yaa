<script lang="ts">
import { Button } from "@yaa/ui";
import { onMount } from "svelte";
import type { Providers } from "./providers.svelte.ts";

// Each provider with what stands between it and a chat: a start button, the
// command that signs in, or what is missing
// (docs/decisions/0023-setup-output-and-sign-in-before-the-terminal.md).
let {
	providers,
	starting,
	onstart,
}: {
	providers: Providers;
	starting: boolean;
	onstart: (provider: string) => void;
} = $props();

onMount(() => providers.checkAll());
</script>

<ul>
	{#each providers.listed as provider (provider.id)}
		{@const status = providers.status(provider.id)}
		<li>
			<span class="provider">{provider.title}</span>
			{#if status?.state === "ready"}
				<span class="detail">
					{status.version}{status.account ? ` · ${status.account}` : ""}
				</span>
				<Button disabled={starting} onclick={() => onstart(provider.id)}>
					Start {provider.title}
				</Button>
			{:else}
				{#if status?.state === "signed-out"}
					<span class="detail">Signed out. Run this in your terminal:</span>
					<code>{status.login}</code>
				{:else if status}
					<span class="detail">{status.problem}</span>
				{:else if providers.checking(provider.id)}
					<span class="detail">Checking…</span>
				{/if}
				<Button
					disabled={providers.checking(provider.id)}
					onclick={() => providers.check(provider.id)}
				>
					Check {provider.title} again
				</Button>
			{/if}
		</li>
	{:else}
		<li class="detail">No agent provider is installed.</li>
	{/each}
</ul>

<style>
ul {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-4);
}

li {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing-1);
}

.provider {
	color: var(--color-text);
}

.detail {
	color: var(--color-text-muted);
	font-size: var(--text-sm);
}

code {
	color: var(--color-text-soft);
	font-family: var(--font-mono);
	user-select: text;
}
</style>
