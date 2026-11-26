# TypeScript rules

Source: `docs/spec/13-repo-conventions.md`. Packages are deep modules: read `packages/README.md` first.

## Types
- Strict mode, from `tsconfig.base.json`. Do not loosen it per package.
- Three programs share it: `tsconfig.json` for Node code (main, core, scripts, plugin backends), `tsconfig.web.json` for the renderer (DOM, no Node) and `tsconfig.preload.json` for the preload. `contracts` is in both Node and web, so it uses neither DOM nor Node APIs.
- No `any`. Use `unknown` and narrow. No non-null assertions (`!`); handle the missing case. No casts (`as`) to quiet the checker.
- Validate data with Zod where it crosses a boundary: protocol messages, the plugin host, disk, agent output, CLI output. Infer the type from the schema (`z.infer`), so there is one definition. Inside the boundary, trust the types: no repeated checks.
- Index signatures and arrays: `noUncheckedIndexedAccess` and `noPropertyAccessFromIndexSignature` are on, so write `record["key"]` and handle `undefined`.
- Only erasable syntax (`erasableSyntaxOnly`): no `enum`, `namespace` or parameter properties. Use union types and `as const` objects.

## Modules
- Named exports only.
- No barrel files except package entry points. No deep imports across packages: import another package by its name and an entry file.
- Relative imports include the extension (`./lib/order.ts`).
- One concept per file. Small functions, pure where possible.

## Code
- No dead code, no commented-out code, no TODO without a reason.
- No comments that restate the code. Comment why, not what.
- A suppression comment needs a reason: `// @ts-expect-error -- why` or `// biome-ignore lint/group/rule: why`. `@ts-ignore` is never allowed.

## What the checks enforce
| Rule | Check |
| --- | --- |
| Strict types | `typecheck` (`tsc`) |
| No `any`, no `!`, no `@ts-ignore`, `biome-ignore` with a reason | `lint` (Biome) |
| `@ts-expect-error` and `@ts-nocheck` with a reason | `lint` (`scripts/check-suppressions.ts`) |
| Entry points only, no cycles, layering | `lint:boundaries` |
| Relative imports with extensions | `lint` (Biome `useImportExtensions`) |
| Named exports, no barrels, Zod at boundaries, no casts, one concept per file, no dead code | review only |
