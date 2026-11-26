<script lang="ts">
import { Button } from "@yaa/ui";
import { onMount } from "svelte";
import type { Providers } from "./providers.svelte.ts";

// Each provider with what stands between it and a session: a start button,
// the command that signs in, or what is missing
// (docs/decisions/0023-setup-output-and-sign-in-before-the-terminal.md).
let {
	providers,
	onstart,
}: { providers: Providers; onstart(provider: string): void } = $props();

onMount(() => {
	// A failed list is reported by the controller.
	providers.checkAll().catch(() => undefined);
});
</script>

<ul class="flex flex-col gap-3">
	{#each providers.listed as provider (provider.id)}
		{@const status = providers.status(provider.id)}
		<li class="flex flex-col items-start gap-1">
			<span class="text-text">{provider.title}</span>
			{#if status?.state === "ready"}
				<span class="text-sm">
					{status.version}{status.account ? ` · ${status.account}` : ""}
				</span>
				<Button onclick={() => onstart(provider.id)}>
					Start {provider.title}
				</Button>
			{:else}
				{#if status?.state === "signed-out"}
					<span class="text-sm">Signed out. Run this in your terminal:</span>
					<code class="select-text font-mono text-text-soft">
						{status.login}
					</code>
				{:else if status}
					<span class="text-sm">{status.problem}</span>
				{:else if providers.checking(provider.id)}
					<span class="text-sm">Checking…</span>
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
		<li>No agent provider is installed.</li>
	{/each}
</ul>
