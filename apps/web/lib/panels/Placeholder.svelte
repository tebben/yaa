<script lang="ts">
import type { PanelProps } from "@yaa/ui/dock";

// Stands in for a panel until the plugin that owns it contributes it.
let { kind }: PanelProps = $props();
</script>

<p class="p-3 text-text-muted">The {kind} panel arrives with its plugin.</p>
