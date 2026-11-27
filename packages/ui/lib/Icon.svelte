<script lang="ts">
import type { IconSource } from "./icon-source.ts";

// An SVG file becomes a mask over the text colour, so it follows hover and
// focus colours like a Lucide icon does.
let {
	icon,
	class: className,
}: { icon: IconSource; class?: string | undefined } = $props();
</script>

{#if typeof icon === "string"}
	<span
		class={["inline-block shrink-0 bg-current", className]}
		style:mask={`url("${icon}") center / contain no-repeat`}
		aria-hidden="true"
	></span>
{:else}
	{@const Lucide = icon}
	<Lucide class={className} aria-hidden="true" />
{/if}
