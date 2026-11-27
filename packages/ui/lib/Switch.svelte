<script lang="ts">
import { Switch } from "bits-ui";

// An on and off switch. `label` names it for screen readers when no visible
// label is tied to it.
let {
	checked,
	label,
	disabled = false,
	onchange,
}: {
	checked: boolean;
	label: string;
	disabled?: boolean;
	onchange: (checked: boolean) => void;
} = $props();
</script>

<Switch.Root
	{checked}
	{disabled}
	aria-label={label}
	onCheckedChange={onchange}
	class="inline-flex h-4.5 w-switch shrink-0 items-center rounded-full border border-border-strong bg-raised p-0.5 outline-focus focus-visible:outline-1 disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent"
>
	<Switch.Thumb
		class="block size-3 rounded-full bg-text-muted transition-transform data-[state=checked]:translate-x-3.5 data-[state=checked]:bg-chrome"
	/>
</Switch.Root>
