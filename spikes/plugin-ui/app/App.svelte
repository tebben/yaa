<script lang="ts">
  import { setContext } from 'svelte';
  import { createHost } from './host.svelte';
  import { createPlugins } from './plugins.svelte';
  const host = createHost();
  setContext('yaa:host', host);
  const plugins = createPlugins();
  let ticks = $state(0);
  (window as any).__spike = { host, plugins, tick: () => ticks++, setTheme: (n: string) => (host.theme.name = n) };
</script>
<main class="p-2">
  <h1 class="text-xl font-bold">app (ticks {ticks})</h1>
  {#each Object.entries(plugins.panels) as [id, p] (id)}
    {@const Panel = p.component}
    <section data-plugin-panel={id}>
      {#key p.version}
      <svelte:boundary onerror={(e) => (plugins.errors[id] = `render: ${e}`)}>
        <Panel {ticks} />
        {#snippet failed(_e, reset)}<button data-plugin-failed={id} onclick={reset}>plugin {id} failed</button>{/snippet}
      </svelte:boundary>
      {/key}
    </section>
  {/each}
  {#each Object.entries(plugins.errors) as [id, e] (id)}
    <pre data-plugin-error={id}>{e}</pre>
  {/each}
</main>
