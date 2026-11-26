<script lang="ts">
import ChevronDown from "@lucide/svelte/icons/chevron-down";
import MessageCircle from "@lucide/svelte/icons/message-circle";
import Plus from "@lucide/svelte/icons/plus";
import { Icon, IconButton } from "@yaa/ui";

// The panel header: the chat on screen, which opens the list of chats, and
// the new chat button.
let {
	title,
	onswitch,
	onnew,
}: {
	title: string | undefined;
	onswitch: () => void;
	onnew: () => void;
} = $props();
</script>

<div class="title">
	<Icon icon={MessageCircle} />
	<button
		type="button"
		class="switch"
		aria-label="Switch chat"
		onclick={onswitch}
	>
		<span class="name">{title ?? "Chat"}</span>
		<Icon icon={ChevronDown} />
	</button>
	<IconButton icon={Plus} label="New chat" onclick={onnew} />
</div>

<style>
.title {
	display: flex;
	align-items: center;
	gap: var(--spacing-1);
	height: 100%;
	min-width: 0;
	padding-left: var(--spacing-3);
}

.title > :global(svg),
.switch :global(svg) {
	flex: none;
	width: var(--spacing-3_5);
	height: var(--spacing-3_5);
}

.switch {
	display: flex;
	align-items: center;
	gap: var(--spacing-1);
	min-width: 0;
	margin-right: auto;
	padding: var(--spacing-0_5) var(--spacing-1);
	border-radius: var(--radius-control);
	font-weight: var(--font-weight-medium);
	outline: none;
}

.switch:hover,
.switch:focus-visible {
	background: var(--color-hover);
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
