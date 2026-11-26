---
name: setup-svelte-structure
description: Wire the thin-component rules into this repo: docs/rules/svelte.md, a lint:svelte-size warning, and dependency-cruiser rules that keep the transport out of components and Svelte out of pure .ts. User-invoked; re-run after changing the rules.
disable-model-invocation: true
---

# Setup Svelte structure

Make every `.svelte` file thin: markup, wiring and style hooks. Behaviour lives beside it, in `.svelte.ts` controllers (runes allowed) and pure `.ts` (no runes, tested without Svelte). The rules come from `docs/spec/13-repo-conventions.md` ("Svelte structure: thin components"). This skill writes them down, adds checks for the ones a tool can see, and proves each check bites.

Run `setup-ts-deep-modules` first: this skill adds rules to its `.dependency-cruiser.cjs`.

## Steps

### 1. Write the rules
Write `docs/rules/svelte.md` from the spec section: the three layers, composition root versus leaf, no transport in components, `ui` primitives and tokens only, the size trigger, snippets over context, extract on the second use. Keep it to one screen. Record which rules are checked and how, and which are review-only.

**Done when:** `docs/rules/svelte.md` exists and lists what is enforced.

### 2. Make dependency-cruiser read Svelte
- `svelte` must resolve from the repo root (`depcruise --info` lists `svelte/compiler` under transpilers). If not, add `svelte` as a root devDependency.
- Add `.svelte` to `options.enhancedResolveOptions.extensions`.

**Done when:** `depcruise --info` shows the svelte transpiler.

### 3. Add the dependency rules
In `.dependency-cruiser.cjs`, under a "Svelte structure" heading:
- `svelte-no-transport`: from `\.svelte$` to the transport client (`^packages/contracts/client\.ts$`). Components reach the core only through a controller.
- `pure-ts-no-svelte`: from `\.ts$` excluding `\.svelte\.ts$` and `index.ts` entry points, to `\.svelte$`.

**Done when:** both rules are in the config with severity `error`.

### 4. Add the size warning
Add `scripts/svelte-size.ts` and a `lint:svelte-size` script: warn when a `.svelte` file is over 150 lines or its `<script>` block over 40. It prints warnings (GitHub annotations in CI) and exits 0. Fold it into `check`.

**Done when:** `pnpm run lint:svelte-size` runs and is part of `check`.

### 5. Prove the checks bite
With temporary files in a Svelte package (`packages/ui/lib/`), check each, then delete them:
1. A `.svelte` file importing `packages/contracts/client.ts` (create a stub if M1 has not) fails `lint:boundaries` with `svelte-no-transport`.
2. A pure `.ts` file importing a `.svelte` file fails with `pure-ts-no-svelte`; the same import from a `.svelte.ts` file and from `index.ts` passes.
3. A 170-line `.svelte` file with a 45-line script prints two warnings and exits 0.
4. With the files removed, `lint:boundaries` passes.

**Done when:** you have seen each fail or warning, then a clean pass.

## Notes
- The leaf-versus-root rule (leaf components never do IPC) is covered by `svelte-no-transport`, which applies to every component, root included: roots create controllers, controllers use the client.
- "Use `ui` primitives, never Bits UI directly" becomes a dependency rule once `ui` wraps Bits UI (M1): forbid `bits-ui` imports outside `packages/ui`.
