<script lang="ts">
  import { getContext, type Snippet } from 'svelte';
  let { onclick, children }: { onclick: () => void; children: Snippet } = $props();
  const host = getContext<{ theme: { name: string } }>('yaa:host');
</script>
<button class="btn" data-theme={host?.theme.name ?? 'no-context'} {onclick}>{@render children()}</button>
<style>
  .btn { background: var(--yaa-accent); color: white; border: 0; padding: var(--yaa-space-2); border-radius: 4px; }
</style>
