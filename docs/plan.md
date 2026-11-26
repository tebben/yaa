# Implementation plan

Order matters. Each milestone ends on something usable and has an exit check: what you can do at the end, and which targets from `docs/spec/12-stack-packaging.md` are measured. Milestones are ordered, not dated. M0 answers the riskiest questions before M1 builds the plugin API. The plugin API is public but unstable until M6 and grows with the built-in plugins that use it (`docs/decisions/0011-plugin-api-unstable-until-m6.md`). Each spec section says which milestone it lands in; build nothing from a later milestone early. Details of each area live in `docs/spec/`.

## Before M0: repo foundation (do first, no feature code)
1. Init monorepo: pnpm workspaces, Node, strict TypeScript, Biome, `svelte-check`, Vitest. pnpm and Node are decided (`docs/decisions/0002-pnpm-and-node.md`).
2. Add Zod 4 to `contracts` for runtime schemas (`docs/decisions/0013-zod-schemas.md`).
3. Run the `setup-ts-deep-modules` skill from `.claude/skills/` (dependency-cruiser, entry points only, `lint:boundaries`), and write our own `setup-svelte-structure` skill (thin `.svelte`, `.svelte.ts` controllers, pure `.ts`, `lint:svelte-size`). See `docs/spec/13-repo-conventions.md`.
4. Write `docs/rules/*.md` (typescript, svelte, plugins, testing; `docs.md` exists) and update the commands in `AGENTS.md` once they run.
5. `check` script: lint (with the strict rules in `docs/spec/13-repo-conventions.md`), typecheck (`tsc` and `svelte-check`), boundaries, svelte size, `check:docs`, unit tests for changed packages only. `check:all` runs everything.
6. CI: a GitHub Actions workflow runs `pnpm run check:all` on every push and pull request (`docs/spec/12-stack-packaging.md`). Branch protection on `main` requires it.

Exit: `pnpm install && pnpm run check` passes on a clean clone and in CI, and a deliberate boundary violation, an unexplained `@ts-ignore` and a spec section without `Lands in:` each make it fail.

## M0: spikes (answer the risky questions; write each result to `docs/decisions/`)
Rules for every spike:
- One spike per agent session, on its own `spike/<name>` branch. Spike code never merges; only the decision file and the spec edits it causes land on `main`.
- Time box: half a day of agent work. When the box runs out, write down what is known and what is not, and decide from that.
- The decision file records the question, what was tried with versions, measurements where the question is about speed, the answer, and what M1 should build. Keep the branch for reference and link it.
- No foundation or M1 code is written during a spike, even when it looks reusable. M1 rewrites what it needs, following the rules.

- ACP with Copilot CLI and Claude Code (adapter package name may have changed): models, thinking effort, skills, MCP list, usage, resume, login, and whether a one-shot `complete()` is possible.
- libghostty-vt inside Electron vs xterm.js + node-pty fallback.
- Svelte plugin hot reload in dev mode only, with one shared Svelte runtime and plugin styling without the app's Tailwind build (`docs/spec/03-plugins.md`).
- Dock grid: evaluate existing docking libraries first (for example dockview; Svelte 5 fit unverified), build custom only if none fits.
- Core transport: `utilityProcess` + `MessagePort` vs a token-protected local WebSocket (`docs/spec/00-overview.md`).
- Electron + pnpm with native modules (node-pty, SQLite or `node:sqlite`); AppImage on Wayland.

Exit: one decision file per spike, and the specs updated where a spike changed them.

## M1: skeleton
Electron shell with a hardened renderer, core process, typed protocol with runtime validation, SQLite with migrations and the event log, log files, app-level settings and keybinding files, dock grid, panels with focus, keybindings with focus contexts, command palette, tokens and theming, plugin host with the first contribution points, and the fake ACP agent.

Exit: the app starts, panels can be arranged and focused by keyboard, the palette runs a command from a plugin, and the fake agent streams a turn into a placeholder panel. Measure launch time and palette open time.

## M2: worktrees and chat (first product slice)
Projects, worktree create, switch and finish, setup hooks, the per-repository git queue, the first real provider end to end (Claude Code, which the M0 spike showed is better covered by ACP: `docs/decisions/0014-acp-coverage.md`), chat with composer, parallel agents, derived state with the combining rules, attention overview, session restore, permission modes, debug panel. Then the second provider, then MCP and skills per worktree.

Exit: you build yaa's next feature inside yaa. Two worktrees run real agents in parallel; one asking a permission question shows Needs attention, and a key jumps to it. Measure worktree switch time and chat streaming.

## M3: code
Editor (Monaco), files, git panel, diff, annotations (notes in diffs or code sent back to the agent), terminal, generated commit messages, text search, conflicts, rebase and stash. Dev-mode plugin hot reload and the agent-authoring tools.

Exit: review an agent's change in the diff, annotate two lines, send them, and see the agent fix them. An agent writes a small plugin in yaa and sees it reload.

## M4: integrations
GitHub (via `gh`), GitLab (via `glab`), Jira with the keyring, PR/MR panel, project overview, usage and cost ledger.

Exit: start a worktree from a Jira ticket, open a PR on GitHub and an MR on GitLab, see CI state and cost.

## M5: workflows and notifications
Workflow engine in core with durable state, manual triggers and the runs panel first, then event and sensor triggers, HITL and auto steps, guardrails for unattended runs, notifications.

Exit: the "review a PR" example workflow runs from a manual trigger and survives an app restart while waiting for approval.

## M6: polish and packaging
Plugin API review and freeze as `1.0`, with version checks in the plugin manager. Light theme and user themes, first-run doctor, project and worktree settings layers, AppImage, deb and rpm for Linux x64, licence notices.

Exit: the AppImage starts on Wayland and X11 on a recent Ubuntu, and the doctor reports every missing tool.

## Later
Pi and Hermes providers; the CLI-versus-native chat toggle, which depends on resume support confirmed in M0; the vim layer; search across transcripts, annotations and runs; VS Code theme import.

## Deliberately out of scope
arm64, plugin marketplace, accessibility work, cost budgets, auto-update in the first release (`docs/decisions/0003-v1-scope.md`); team-sharing features (`docs/decisions/0012-no-team-sharing.md`).
