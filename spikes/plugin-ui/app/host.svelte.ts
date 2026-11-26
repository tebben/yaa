// What the app hands plugins through context: theme and plugin storage.
// Storage survives a plugin reload because it lives in the app, not the module.
export function createHost() {
  const theme = $state({ name: 'dark' });
  const store = $state<Record<string, unknown>>({});
  return {
    theme,
    storage: {
      get: <T>(key: string, fallback: T): T => (key in store ? (store[key] as T) : fallback),
      set: (key: string, value: unknown) => { store[key] = value; },
    },
  };
}
export type Host = ReturnType<typeof createHost>;
