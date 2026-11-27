<script lang="ts">
import type { SettingSpec } from "@yaa/contracts/settings";
import {
	ColorField,
	NumberField,
	Segmented,
	Select,
	Switch,
	TextField,
} from "@yaa/ui";
import ListControl from "./ListControl.svelte";

// The control for a setting's type. A choice of up to three options shows
// them side by side; more go in a list.
let {
	spec,
	value,
	disabled,
	onchange,
	onpreview,
}: {
	spec: SettingSpec;
	value: unknown;
	disabled: boolean;
	onchange: (value: unknown) => void;
	// A value shown before it is chosen, such as a colour being picked.
	onpreview: (value: unknown) => void;
} = $props();

const text = (fallback: string) =>
	typeof value === "string" ? value : fallback;
</script>

{#if spec.type === "boolean"}
	<Switch checked={value === true} label={spec.title} {disabled} {onchange} />
{:else if spec.type === "number"}
	<NumberField
		value={typeof value === "number" ? value : spec.default}
		min={spec.min}
		max={spec.max}
		step={spec.step}
		unit={spec.unit}
		label={spec.title}
		{disabled}
		{onchange}
	/>
{:else if spec.type === "choice" && spec.options.length <= 3}
	<Segmented
		value={text(spec.default)}
		options={spec.options}
		label={spec.title}
		{disabled}
		{onchange}
	/>
{:else if spec.type === "choice"}
	<Select
		value={text(spec.default)}
		options={spec.options}
		label={spec.title}
		{disabled}
		{onchange}
	/>
{:else if spec.type === "color"}
	<ColorField
		value={text(spec.default)}
		label={spec.title}
		{disabled}
		oninput={onpreview}
		{onchange}
	/>
{:else if spec.type === "text"}
	<div class={["w-field", spec.mono && "font-mono text-sm"]}>
		<TextField
			value={text(spec.default)}
			placeholder={spec.placeholder}
			aria-label={spec.title}
			{disabled}
			onchange={(event) => {
				const typed = event.currentTarget.value;
				// A required setting cannot be emptied; the field shows it again.
				if (spec.required && typed.trim() === "") {
					event.currentTarget.value = text(spec.default);
					return;
				}
				onchange(typed);
			}}
		/>
	</div>
{:else}
	<ListControl
		items={Array.isArray(value)
			? value.filter((item) => typeof item === "string")
			: spec.default}
		placeholder={spec.placeholder}
		mono={spec.mono ?? false}
		label={spec.title}
		{disabled}
		{onchange}
	/>
{/if}
