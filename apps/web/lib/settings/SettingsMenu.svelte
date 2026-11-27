<script lang="ts">
import ArrowLeft from "@lucide/svelte/icons/arrow-left";
import Search from "@lucide/svelte/icons/search";
import { Icon, TextField } from "@yaa/ui";
import type { SettingsController } from "./settings.svelte.ts";
import type { SettingsPage } from "./settings-pages.ts";

// The left menu while the settings screen is open: the way back, the
// search, and the pages, core's first and then the plugins'.
let {
	settings,
	onclose,
}: { settings: SettingsController; onclose: () => void } = $props();

const app = $derived(settings.pages.filter(({ plugin }) => !plugin));
const plugins = $derived(settings.pages.filter(({ plugin }) => plugin));
const row =
	"flex h-control w-full cursor-pointer items-center gap-2 px-3 text-left outline-none hover:bg-hover focus-visible:bg-hover";
</script>

<button
	type="button"
	class={[row, "text-text-soft hover:text-text"]}
	onclick={onclose}
>
	<Icon icon={ArrowLeft} class="size-3.5 text-text-muted" />
	Back to app
</button>
<search class="mx-3 mt-2 mb-3">
	<TextField
		icon={Search}
		placeholder="Search settings"
		aria-label="Search settings"
		bind:value={() => settings.query, (text) => (settings.query = text)}
	/>
</search>
<div class="min-h-0 flex-1 overflow-y-auto">
	{@render list("App", app)}
	{#if plugins.length > 0}
		{@render list("Plugins", plugins)}
	{/if}
</div>

{#snippet list(title: string, pages: readonly SettingsPage[])}
	<h2 class="mt-2 px-3 pb-1 text-xs tracking-wide text-text-muted uppercase">
		{title}
	</h2>
	<ul>
		{#each pages as page (page.id)}
			{@const current = settings.query === "" && settings.page?.id === page.id}
			<li>
				<button
					type="button"
					class={[row, current ? "bg-selection text-text" : "text-text-soft"]}
					aria-current={current ? "page" : undefined}
					onclick={() => settings.show(page.id)}
				>
					<Icon icon={settings.iconOf(page)} class="size-3.5 text-text-muted" />
					<span class="truncate">{page.title}</span>
				</button>
			</li>
		{/each}
	</ul>
{/snippet}
