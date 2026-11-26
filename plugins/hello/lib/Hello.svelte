<script lang="ts">
// The hello panel: plain markup and a scoped style on the token variables,
// since plugins never rely on the app's Tailwind classes.
import type { PanelProps } from "@yaa/plugin-api/ui";

let { panel }: PanelProps = $props();
</script>

<div class="hello">
	<p class="title">Hello from a plugin, on {panel.worktree.branch}</p>
	<p>
		Run “Say hello” from the command palette, or press Ctrl Alt H. It writes a
		line to the log.
	</p>
</div>

<style>
.hello {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2);
	padding: var(--spacing-3);
	color: var(--color-text-muted);
}

.title {
	color: var(--color-text);
}
</style>
