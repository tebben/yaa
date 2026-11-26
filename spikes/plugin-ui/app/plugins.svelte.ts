import { tick, type Component } from 'svelte';

type Built = { id: string; version: number; buildMs: number; ok: boolean; errors: string[]; writtenAt?: number };
declare global {
  interface Window { yaa: { onPluginBuilt(cb: (b: Built) => void): void; report(r: unknown): void } }
}

// Loads plugin UI modules and swaps them in place when the dev-mode host rebuilds them.
export function createPlugins() {
  const panels = $state<Record<string, { component: Component<any>; version: number }>>({});
  const errors = $state<Record<string, string>>({});

  async function load(id: string, version: number) {
    const base = `yaa-plugin://${id}/`;
    const t0 = performance.now();
    try {
      const mod = await import(/* @vite-ignore */ `${base}ui.js?v=${version}`);
      await swapStyles(id, `${base}ui.css?v=${version}`);
      panels[id] = { component: mod.panel, version };
      delete errors[id];
    } catch (e) {
      // A failed load keeps the previous version running.
      errors[id] = String(e);
    }
    return performance.now() - t0;
  }

  function swapStyles(id: string, href: string) {
    return new Promise<void>((resolve) => {
      const old = document.querySelector(`link[data-plugin="${id}"]`);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.plugin = id;
      link.onload = link.onerror = () => { old?.remove(); resolve(); };
      document.head.append(link);
    });
  }

  window.yaa.onPluginBuilt(async (b) => {
    if (!b.ok) { errors[b.id] = b.errors.join('\n'); window.yaa.report({ ...b, kind: 'build-failed' }); return; }
    const loadMs = await load(b.id, b.version);
    // Wait for the swapped component to be in the DOM.
    await tick();
    window.yaa.report({ kind: 'swapped', id: b.id, version: b.version, buildMs: b.buildMs, loadMs, swappedAt: Date.now(), writtenAt: b.writtenAt, builtAt: (b as any).builtAt, error: errors[b.id] });
  });

  return { panels, errors, load };
}
