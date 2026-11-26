<script lang="ts">
import { Button } from "@yaa/ui";

// A prompt line: Enter sends it, and while a turn runs the button cancels.
let {
	running,
	commands,
	onsend,
	oncancel,
}: {
	running: boolean;
	commands: readonly { name: string }[];
	onsend: (text: string) => void;
	oncancel: () => void;
} = $props();

let text = $state("");
const hint = $derived(
	commands.length > 0
		? `Prompt, or ${commands.map(({ name }) => `/${name}`).join(", ")}`
		: "Prompt",
);
</script>

<form
	class="flex items-center gap-2 border-t border-border p-2"
	onsubmit={(event) => {
		event.preventDefault();
		if (running || text.trim() === "") return;
		onsend(text);
		text = "";
	}}
>
	<input
		class="h-control min-w-0 flex-1 rounded-control border border-border-strong bg-raised px-2 text-text outline-focus placeholder:text-text-muted focus-visible:outline-1"
		placeholder={hint}
		aria-label="Prompt"
		bind:value={text}
	>
	{#if running}
		<Button onclick={oncancel}>Cancel</Button>
	{:else}
		<Button type="submit" disabled={text.trim() === ""}>Send</Button>
	{/if}
</form>
