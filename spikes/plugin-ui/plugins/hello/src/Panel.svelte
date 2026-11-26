<script lang="ts">
  import { getContext } from 'svelte';
  import { fade } from 'svelte/transition';
  import { SvelteMap } from 'svelte/reactivity';
  import { Button } from '@yaa/ui';
  import { createCounter } from './counter.svelte';

  let { ticks }: { ticks: number } = $props();
  const host = getContext<any>('yaa:host');
  const counter = createCounter(host.storage.get('hello.count', 0), (n) => host.storage.set('hello.count', n));
  let local = $state(0);
  const seen = new SvelteMap<number, number>();
  $effect(() => { seen.set(ticks, Date.now()); });
  const label = 'v1';
</script>

<div class="panel" data-label={label}>
  <p class="title" data-check="title">hello plugin {label}</p>
  <p data-check="ticks">ticks {ticks}</p>
  <p data-check="theme">theme {host.theme.name}</p>
  <p data-check="stored">stored {counter.n} doubled {counter.doubled}</p>
  <p data-check="local">local {local}</p>
  <p data-check="seen">seen {seen.size}</p>
  <Button onclick={() => { counter.inc(); local++; }}>inc</Button>
  <p class="bg-pink-500 p-7" data-check="tw-missing">tailwind class only the plugin uses</p>
  <p class="font-bold" data-check="tw-present">tailwind class the app also uses</p>
  {#if ticks % 2 === 0}<span transition:fade data-check="fade">even</span>{/if}
</div>

<style>
  .panel { border: 1px solid var(--yaa-accent); padding: var(--yaa-space-2); margin-top: var(--yaa-space-2); }
  .title { color: var(--yaa-accent); }
  p { margin: 2px 0; }
</style>
