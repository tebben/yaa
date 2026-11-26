# Implementation plan

Order matters. Each milestone ends on something usable. Details of each area live in `docs/spec/`.

## Before M0: repo foundation (do first, no feature code)
1. Init monorepo (pnpm workspaces, Node, TypeScript strict, Biome, Vitest).
2. Create the two structure skills: `setup-ts-deep-modules` (dependency-cruiser, entry points only, `lint:boundaries`) and our own `setup-svelte-structure` (thin `.svelte`, `.svelte.ts` controllers, pure `.ts`, `lint:svelte-size`). See `docs/spec/13-repo-conventions.md`.
3. Write `docs/rules/*.md` (typescript, svelte, plugins, testing) and fill the `<pm>` placeholders in `AGENTS.md`.
4. `check` script: lint, typecheck, boundaries, svelte size, unit tests for changed packages only.

## M0: spikes (answer the risky questions; write each result to `docs/decisions/`)
- ACP with Copilot CLI and Claude Code (adapter package name may have changed): models, thinking effort, skills, MCP list, usage, resume, login.
- libghostty-vt inside Electron vs xterm.js + node-pty fallback.
- Svelte plugin hot reload in dev mode only.
- Dock grid: custom vs library.
- Electron + pnpm with native modules (node-pty, SQLite); AppImage on Wayland.
- Confirm pnpm + Node (Bun not the runtime).

## M1: skeleton
Electron shell, backend process, typed WebSocket protocol, dock grid, panels with focus, command palette, tokens/theming, plugin host with the first contribution points.

## M2: worktrees and chat (first product slice)
Projects, worktree create/switch, agent providers (Copilot, Claude, Pi), chat with composer, parallel agents, derived state, attention overview, CLI-vs-native chat toggle.

## M3: code
Editor (Monaco), files, git panel, diff, annotations (notes in diffs/code sent back to the agent), terminal.

## M4: integrations
GitHub (via `gh`), Jira, PR/MR panel, project overview, usage and cost ledger.

## M5: workflows and notifications
Workflow engine in core with durable state, manual triggers + runs panel first, then event and sensor triggers, HITL/auto steps, guardrails for unattended runs, notifications.

## M6: polish and packaging
Themes, first-run doctor, settings and keybinding files, AppImage/deb/rpm for Linux x64.

## Deliberately out of scope
arm64, plugin marketplace, accessibility work, cost budgets, auto-update in the first release.
