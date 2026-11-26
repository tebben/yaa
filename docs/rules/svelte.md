# Svelte rules

Source: `docs/spec/13-repo-conventions.md`. Follow the `svelte-core-bestpractices` skill and run the `svelte-code-writer` autofixer (or the Svelte MCP) on every `.svelte` and `.svelte.ts` file you touch.

## Three layers
- `.svelte`: markup, wiring and style hooks only.
- `.svelte.ts`: controllers. Reactive state, derived values and actions; they talk to the typed client from `contracts`. Export a factory or an object with getters and named methods, never reassigned state.
- `.ts`: pure logic, no runes, no Svelte imports. Tested without Svelte.

## Components
- The composition root creates the controller and hands slices to children. Leaf components are presentational: props in, callbacks out.
- No component imports the transport (WebSocket, `MessagePort`, IPC) or the client; only controllers do.
- Use `ui` primitives, never Bits UI directly. Every colour and spacing value is a token. Icons from `@lucide/svelte`.
- Compose with snippets and `children`. Context only for app-wide things, never to skip passing a prop one level.
- Extract on the second use, to `ui` or the feature folder. No speculative generalisation.
- A feature folder exposes itself through `index.ts`, which may export its components.

## Size
A `.svelte` file over about 150 lines, or a `<script>` over about 40, is a prompt to split. `lint:svelte-size` warns; it does not fail.

## What the checks enforce
| Rule | Check |
| --- | --- |
| Components never import the transport client | `lint:boundaries`, `svelte-no-transport` |
| Pure `.ts` never imports `.svelte` | `lint:boundaries`, `pure-ts-no-svelte` |
| Size trigger | `lint:svelte-size` (warning) |
| Types in `.svelte` | `svelte-check` in `typecheck` |
| No `any`, no `!`, unexplained suppressions | Biome in `lint`, inside `.svelte` too |
| Thin markup, snippets, tokens, `ui` only | review only; tokens and Bits UI get checks in M1 |

## Biome and Svelte
Biome 2.6 runs with `html.experimentalFullSupportEnabled`, so it parses the whole `.svelte` file: it lints the script with markup usage in view and formats markup and script (style formatting not checked). Without the flag it lints only the script and reports variables used only in markup as unused. The flag is experimental: if it formats a file badly, report it and exclude that file in `biome.json` with a reason rather than reformatting by hand.
