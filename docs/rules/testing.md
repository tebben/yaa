# Testing rules

Source: `docs/spec/13-repo-conventions.md` and `docs/decisions/0008-lean-testing.md`. The goal is a fast loop, not coverage.

## What gets tests
- Pure logic: naming, ordering, annotation anchoring, cost calculation, workflow context and templating.
- Protocol contracts: schemas in `contracts` accept what they should and reject what they should not.
- The workflow engine's state transitions.
- A bug fix in any of these gets one regression test.

## What does not
- Svelte components, wiring and thin controllers.
- Snapshot tests, one test per component, tests that restate the implementation.
- Real agents. Use the fake ACP agent and its scripted event files.

## How
- Tests live in the package's `tests/` folder and import only entry points (`lint:boundaries` enforces this).
- Vitest, one config per package where needed. Name files `*.test.ts`.
- No network, no real home directory, no sleeps. Fake time with Vitest's timers.

## Running
- `pnpm run check` runs unit tests for changed packages only: those changed against `origin/main` and the packages that depend on them. It sees committed, staged and modified files, but not new untracked files: `git add` new files before you run it.
- `pnpm --filter @yaa/<name> test` runs one package. Prefer it while you work.
- Use a package filter during development. CI and the pre-push hook run `check:all`.
- Smoke tests (app starts, a worktree opens, a fake chat turn renders) run in CI and on demand from M1: `pnpm run smoke` (`apps/desktop/scripts/smoke.ts`). Run it after changing main, the preload, the shell, the palette, the plugin host or the agent path. A new user-facing flow that must not break gets a step there, not a component test. End-to-end runs only before a release.
- Install the pre-push hook as described in `README.md`. It requires a clean checkout at the pushed commit and runs `check:all` and the smoke test. On Linux the smoke test uses Xvfb, as in CI.

## Budget (proposed, revisit in M2)
- One test per behaviour, not per function. A pure module rarely needs more than about ten.
- A single test runs in under 100 ms; a package's suite in under 5 s.
