// Svelte ships no types for the private entries its compiled components
// import. The app never calls them; it only hands their namespaces to
// plugins (shared-modules.ts).
declare module "svelte/internal/client" {}
declare module "svelte/internal/init-operations" {}
