/** Counts mounts and unmounts of panel components, read by the probe script. */
export const stats = { mounts: 0, unmounts: 0, tabMounts: 0, tabUnmounts: 0 };
(globalThis as unknown as { __stats: typeof stats }).__stats = stats;
