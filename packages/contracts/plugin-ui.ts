// The contract between the plugin build and the renderer that loads its
// output (docs/decisions/0015-plugin-ui-loading.md).

// The global the app puts its shared modules on: the real namespaces of
// svelte's client entries and of @yaa/ui. A plugin's imports of them are
// compiled to reads from it.
export const sharedModulesKey = "__yaaShared";

// The specifiers the app shares. Any other svelte entry is refused at build
// time, so a plugin never carries a copy of the runtime.
export const sharedModules = [
	"svelte",
	"svelte/animate",
	"svelte/attachments",
	"svelte/easing",
	"svelte/events",
	"svelte/motion",
	"svelte/reactivity",
	"svelte/reactivity/window",
	"svelte/store",
	"svelte/transition",
	// Imported by compiled components, never by plugin source.
	"svelte/internal/client",
	"svelte/internal/init-operations",
	"@yaa/ui",
	"@yaa/ui/focus",
] as const;

export type SharedModule = (typeof sharedModules)[number];

// The export the build adds to every UI module: the Svelte version it was
// compiled against. The app runs a plugin only on that exact version.
export const svelteVersionExport = "svelteVersion";
