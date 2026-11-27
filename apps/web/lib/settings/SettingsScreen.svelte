<script lang="ts">
import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
import { Icon } from "@yaa/ui";
import AgentsPage from "./AgentsPage.svelte";
import SettingRow from "./SettingRow.svelte";
import type { SettingsController } from "./settings.svelte.ts";

// The settings screen in the grid's place: the chosen page, or what the
// search found, as groups of settings on cards.
let { settings }: { settings: SettingsController } = $props();
</script>

<section
	class="size-full overflow-y-auto rounded-panel bg-surface [scrollbar-gutter:stable_both-edges]"
	aria-label="Settings"
>
	<div class="mx-auto flex w-settings-page max-w-full flex-col gap-4 p-4.5">
		{#if settings.problems.length > 0}
			<div class="rounded-panel bg-menu p-3 text-sm text-text-soft">
				<p class="flex items-center gap-2 text-state-attention">
					<Icon icon={TriangleAlert} class="size-3.5" />
					settings.json has problems. Where it does, the default applies.
				</p>
				<ul class="mt-1.5 flex flex-col gap-0.5">
					{#each settings.problems as problem, index (index)}
						<li>
							{#if problem.path.length > 0}
								<span class="font-mono">{problem.path.join(".")}</span>:
							{/if}
							{problem.message}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#each settings.shown as page (page.id)}
			<header class="pt-2">
				<h1 class="text-title font-medium text-text">{page.title}</h1>
				<p class="text-text-soft">{page.description}</p>
			</header>
			{#if page.view === "agents"}
				<AgentsPage agents={settings.agents} />
			{/if}
			{#each page.groups as group (group.title)}
				<section class="flex flex-col gap-2">
					<h2 class="px-3 font-medium text-text">{group.title}</h2>
					<div class="divide-y divide-border rounded-panel bg-menu">
						{#each group.settings as setting (setting.key)}
							<SettingRow {settings} {setting} />
						{/each}
					</div>
				</section>
			{/each}
		{:else}
			<p class="pt-2 text-text-muted">No setting matches.</p>
		{/each}
	</div>
</section>
