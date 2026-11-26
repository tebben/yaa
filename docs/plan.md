# Implementation plan

Order matters. Each milestone ends on something usable and has an exit check: what you can do at the end, and which targets from `docs/spec/12-stack-packaging.md` are measured. Milestones are ordered, not dated. M0 answers the riskiest questions before M1 builds the plugin API, and the plugin API grows with the built-in plugins that use it. Details of each area live in `docs/spec/`.

## Before M0: repo foundation (do first, no feature code)
1. Init monorepo: pnpm workspaces, Node, strict TypeScript, Biome, `svelte-check`, Vitest. pnpm and Node are decided (`docs/decisions/0002-pnpm-and-node.md`).
2. Pick the runtime schema library for `contracts` (open question; ask before choosing).
3. Create the two structure skills: `setup-ts-deep-modules` (dependency-cruiser, entry points only, `lint:boundaries`) and our own `setup-svelte-structure` (thin `.svelte`, `.svelte.ts` controllers, pure `.ts`, `lint:svelte-size`). See `docs/spec/13-repo-conventions.md`.
4. Write `docs/rules/*.md` (typescript, svelte, plugins, testing; `docs.md` exists) and update the commands in `AGENTS.md` once they run.
5. `check` script: lint, typecheck (`tsc` and `svelte-check`), boundaries, svelte size, unit tests for changed packages only. `check:all` runs everything.

Exit: `pnpm install && pnpm run check` passes on a clean clone, and a deliberate boundary violation makes it fail.

## M0: spikes (answer the risky questions; write each result to `docs/decisions/`)
- ACP with Copilot CLI and Claude Code (adapter package name may have changed): models, thinking effort, skills, MCP list, usage, resume, login, and whether a one-shot `complete()` is possible.
- libghostty-vt inside Electron vs xterm.js + node-pty fallback.
- Svelte plugin hot reload in dev mode only, with one shared Svelte runtime and plugin styling without the app's Tailwind build (`docs/spec/03-plugins.md`).
- Dock grid: custom vs library.
- Core transport: `utilityProcess` + `MessagePort` vs a token-protected local WebSocket (`docs/spec/00-overview.md`).
- Electron + pnpm with native modules (node-pty, SQLite or `node:sqlite`); AppImage on Wayland.

Exit: one decision file per spike, and the specs updated where a spike changed them.

## M1: skeleton
Electron shell with a hardened renderer, core process, typed protocol with runtime validation, SQLite with migrations and the event log, dock grid, panels with focus, keybindings with focus contexts, command palette, tokens and theming, plugin host with the first contribution points, and the fake ACP agent.

Exit: the app starts, panels can be arranged and focused by keyboard, the palette runs a command from a plugin, and the fake agent streams a turn into a placeholder panel. Measure launch time and palette open time.

## M2: worktrees and chat (first product slice)
Projects, worktree create, switch and finish, setup hooks, the per-repository git queue, the first real provider end to end (Copilot CLI or Claude Code, whichever the M0 spike shows is better covered by ACP), chat with composer, parallel agents, derived state with the combining rules, attention overview. Then the second provider.

Exit: two worktrees run real agents in parallel; one asking a permission question shows Needs attention, and a key jumps to it. Measure worktree switch time and chat streaming.

## M3: code
Editor (Monaco), files, git panel, diff, annotations (notes in diffs or code sent back to the agent), terminal.

Exit: review an agent's change in the diff, annotate two lines, send them, and see the agent fix them.

## M4: integrations
GitHub (via `gh`), Jira, PR/MR panel, project overview, usage and cost ledger.

Exit: start a worktree from a Jira ticket, open a PR from it, see CI state and cost.

## M5: workflows and notifications
Workflow engine in core with durable state, manual triggers and the runs panel first, then event and sensor triggers, HITL and auto steps, guardrails for unattended runs, notifications.

Exit: the "review a PR" example workflow runs from a manual trigger and survives an app restart while waiting for approval.

## M6: polish and packaging
Light theme, first-run doctor, settings and keybinding files, AppImage, deb and rpm for Linux x64.

Exit: the AppImage starts on Wayland and X11 on a recent Ubuntu, and the doctor reports every missing tool.

## Later
Pi and Hermes providers; the CLI-versus-native chat toggle, which depends on resume support confirmed in M0.

## Deliberately out of scope
arm64, plugin marketplace, accessibility work, cost budgets, auto-update in the first release (`docs/decisions/0003-v1-scope.md`).
