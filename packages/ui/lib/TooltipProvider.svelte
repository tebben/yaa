<script lang="ts">
import { Tooltip } from "bits-ui";
import type { Snippet } from "svelte";

// One provider at the app's root, so moving between controls shows the next
// tooltip without waiting again.
let { children }: { children: Snippet } = $props();
</script>

<Tooltip.Provider delayDuration={400}> {@render children()} </Tooltip.Provider>
