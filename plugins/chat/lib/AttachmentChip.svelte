<script lang="ts">
import File from "@lucide/svelte/icons/file";
import Image from "@lucide/svelte/icons/image";
import X from "@lucide/svelte/icons/x";
import { Icon } from "@yaa/ui";

// A file or image a prompt carries.
let {
	attachment,
	onopen,
	onremove,
}: {
	attachment: { type: "file"; path: string } | { type: "image"; name: string };
	onopen?: (() => void) | undefined;
	onremove?: () => void;
} = $props();

const name = $derived(
	attachment.type === "file"
		? (attachment.path.split("/").at(-1) ?? attachment.path)
		: attachment.name,
);
</script>

<span class="chip" title={attachment.type === "file" ? attachment.path : name}>
	<Icon icon={attachment.type === "file" ? File : Image} />
	{#if onopen}
		<button type="button" class="name" onclick={onopen}>{name}</button>
	{:else}
		<span class="name">{name}</span>
	{/if}
	{#if onremove}
		<button
			type="button"
			class="remove"
			aria-label={`Remove ${name}`}
			onclick={onremove}
		>
			<Icon icon={X} />
		</button>
	{/if}
</span>

<style>
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-1);
	min-width: 0;
	max-width: 100%;
	padding: var(--spacing-0_5) var(--spacing-1_5);
	border: 1px solid var(--color-border-strong);
	border-radius: var(--radius-chip);
	font-family: var(--font-mono);
	font-size: var(--text-xs);
}

.chip :global(svg) {
	flex: none;
	width: var(--spacing-3);
	height: var(--spacing-3);
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

button {
	display: flex;
	outline-color: var(--color-focus);
}

button.name {
	display: block;
}

button.name:hover {
	text-decoration: underline;
}

.remove {
	color: var(--color-text-muted);
}

.remove:hover {
	color: var(--color-text);
}
</style>
