// The modules plugins share with the app. A plugin's imports of these
// specifiers are compiled to reads from this registry, so plugin code runs on
// the app's single Svelte instance and the app's ui components.
import * as svelte from 'svelte';
import * as client from 'svelte/internal/client';
import * as store from 'svelte/store';
import * as reactivity from 'svelte/reactivity';
import * as transition from 'svelte/transition';
import * as easing from 'svelte/easing';
import * as events from 'svelte/events';
import * as ui from './ui/index';
import 'svelte/internal/init-operations';

const registry: Record<string, unknown> = {
  svelte,
  'svelte/internal/client': client,
  'svelte/store': store,
  'svelte/reactivity': reactivity,
  'svelte/transition': transition,
  'svelte/easing': easing,
  'svelte/events': events,
  // Side-effect only; the app has already run it.
  'svelte/internal/init-operations': {},
  '@yaa/ui': ui,
};
(globalThis as Record<string, unknown>).__yaaShared = registry;
export const sharedClient = client;
