# Packages are deep modules

Every workspace package in `apps/`, `packages/` and `plugins/` is a deep module: a lot of behaviour behind a small interface. `pnpm run lint:boundaries` enforces this with dependency-cruiser (`.dependency-cruiser.cjs`).

```text
packages/<name>/
  package.json    exports point at the root entry files
  index.ts        an entry point (public); import this from outside
  client.ts       another entry point; a package may expose several
  lib/            implementation, private to the package
  tests/          tests and fixtures, private to the package
```

**Entry points only.** Code outside a package imports only its root files, never anything in a subfolder. Any subfolder is private, not just `lib/`.

**Freedom inside.** A package's own files import each other freely. Packages are flat: a package never contains another package.

**Tests through entry points.** Files in `tests/` import any package's entry points and their own fixtures, never internals, not even their own package's. Nothing outside `tests/` imports from it.

**No cycles.** Dependency cycles fail the check.

**Layering.** Plugins never import `packages/core`; they use `plugin-api`, `contracts` and `ui`. The renderer (`apps/web`, `packages/ui`) never imports `packages/core`; it talks to core through the typed protocol.

**No barrels.** Do not re-export a whole subtree through one `index.ts`. Expose several small entry points instead, each a root file.
