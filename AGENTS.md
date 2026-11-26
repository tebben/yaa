# AGENTS.md

Read `docs/README.md` first; it says which doc wins and where each topic lives.

## Commands
- Install: `pnpm install` (Node 24, pnpm from `packageManager`)
- Full check, run before finishing: `pnpm run check` (lint, typecheck, boundaries, Svelte size, docs, tests of changed packages; `git add` new files first)
- One package's tests: `pnpm --filter @yaa/<name> test`
- Format: `pnpm run format`
- Everything, as CI runs it: `pnpm run check:all`
- Dev (`pnpm run dev`) arrives in M1 and Linux packaging (`pnpm run package:linux`) in M6.

## Architecture
- Backend owns agents, git and plugins; the UI only subscribes. See docs/spec/00-overview.md.
- Every package and plugin is a deep module: import entry points only. Read packages/README.md before adding or importing one.
- The plugin API is unstable until M6. If a plugin needs something the API lacks, change the API (plugin-api, contracts, core) and fix the built-in plugins it breaks in the same change. Never work around it, never add compatibility shims (docs/spec/03-plugins.md).
- Agents are reached through ACP behind one provider interface (docs/spec/05-agents-chat.md).
- Worktree state (Idle, Running, Needs attention, Error, Done) is derived from events, never stored by hand.

## Where to look
- What to build: docs/spec/ (index in docs/README.md)
- How it looks: docs/design/ui.md and tokens.json. Mockups are a guide, not a spec: look at the PNGs in docs/design/mockups/, do not copy the .dc.html markup.
- What next: docs/plan.md. Each spec section has a "Lands in" milestone; do not build later-milestone items early. Open questions: docs/decisions/.

## Rules: read the relevant one before editing
- TypeScript: docs/rules/typescript.md
- Svelte: docs/rules/svelte.md
- Plugins: docs/rules/plugins.md
- Testing: docs/rules/testing.md
- Docs, specs and decisions: docs/rules/docs.md

## Change style
- Smallest change that leaves the design right. If the existing structure does not fit the task, refactor it first, in its own commit, then build on it. Never patch around it: no special-case flags or parameters for one caller, no copied code, no shims, no casts, `any` or suppression comments to quiet the checker.
- Replace, don't add beside: code that supersedes other code deletes it in the same change. No dead code, no commented-out code, no TODO without a reason.
- You may change a package's entry points or `contracts` when the task needs it; say so in your summary. Changing the architecture in docs/spec/00-overview.md or anything a decision file records: ask first.
- Extend an existing building block before writing a new one; extract on the second use.
- Colours and spacing come from tokens, never literals; icons from @lucide/svelte.
- Keep .svelte files thin: logic in .svelte.ts controllers or pure .ts.
- Tests only for pure logic, contracts and the workflow engine; no component or wiring tests.
- Behaviour change: update the owning spec in the same commit (docs/rules/docs.md).
- Do not invent package names, APIs or sources; verify against docs or the registry, and say when unsure.
- Bugs: fix the first place the system went wrong, not where the symptom showed. A guard, retry, fallback or swallowed error that hides a bad state is not a fix. Use the `diagnosing-bugs` skill for anything not obvious.
- Svelte files: follow the `svelte-core-bestpractices` skill and run the `svelte-code-writer` autofixer (or the Svelte MCP) before finishing.
- Before finishing: `check` passes, you reread your own diff, and your summary lists what you were unsure about and any refactor you did.
