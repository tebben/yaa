<script lang="ts">
import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
import { IconButton } from "@yaa/ui";
import SettingControl from "./SettingControl.svelte";
import type { SettingsController } from "./settings.svelte.ts";
import { isDefault, type ListedSetting } from "./settings-pages.ts";

// One setting: its title and description, a reset button while it is not
// the default, and its control. A list takes the row's width under them.
let {
	settings,
	setting,
}: { settings: SettingsController; setting: ListedSetting } = $props();

const { key, spec } = $derived(setting);
const value = $derived(settings.values?.[key] ?? spec.default);
const enabled = $derived(
	spec.enabledBy === undefined || settings.values?.[spec.enabledBy] === true,
);
const changed = $derived(!isDefault(spec, value));
const wide = $derived(spec.type === "list");
</script>

<div
	class={[
		"flex gap-3 px-3 py-2.5",
		wide ? "flex-col" : "items-center",
		!enabled && "text-text-muted",
	]}
>
	<div class="flex min-w-0 flex-1 items-center gap-3">
		<div class="min-w-0 flex-1">
			<p class={enabled ? "text-text" : "text-text-muted"}>{spec.title}</p>
			{#if spec.description}
				<p class="text-sm text-text-muted">{spec.description}</p>
			{/if}
		</div>
		<span class={["shrink-0", !changed && "invisible"]}>
			<IconButton
				icon={RotateCcw}
				label="Reset to default"
				onclick={() => settings.set(key, spec.default)}
			/>
		</span>
	</div>
	<div class="shrink-0">
		<SettingControl
			{spec}
			{value}
			disabled={!enabled}
			onchange={(next) => settings.set(key, next)}
			onpreview={(next) => settings.preview(key, next)}
		/>
	</div>
</div>
