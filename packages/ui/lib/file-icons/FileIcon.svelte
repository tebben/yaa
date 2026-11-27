<script lang="ts">
import { File } from "@lucide/svelte";
import Icon from "../Icon.svelte";
import { fileIconSvg } from "./file-icons.svelte.ts";

// A file's icon by its name, in the colours of its kind, from the Catppuccin
// set (docs/design/ui.md); a plain file, in the text colour, for a kind the
// set has no icon for. Sized by `class`, like Icon.
let { path, class: className }: { path: string; class?: string | undefined } =
	$props();

const svg = $derived(fileIconSvg(path));
</script>

{#if svg}
	<svg class={["shrink-0", className]} viewBox={svg.viewBox} aria-hidden="true">
		<!-- The body is the icon set's own markup, from a pinned package. -->
		{@html svg.body}
	</svg>
{:else}
	<Icon icon={File} class={className} />
{/if}
