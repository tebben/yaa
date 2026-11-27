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
- Dock grid: evaluate existing docking libraries first, build custom only if none fits (`docs/decisions/0016-dock-grid-dockview.md`).
- Core transport: `utilityProcess` + `MessagePort` vs a token-protected local WebSocket (`docs/spec/00-overview.md`).
- Electron + pnpm with native modules (node-pty, SQLite or `node:sqlite`); AppImage on Wayland.

Exit: one decision file per spike, and the specs updated where a spike changed them.

## M1: skeleton
Electron shell with a hardened renderer, core process, typed protocol with runtime validation, SQLite with migrations and the event log, log files, app-level settings and keybinding files, dock grid, panels with focus, keybindings with focus contexts, command palette, tokens and theming, plugin host with the first contribution points, and the fake ACP agent.

Build order, one pull request each:
1. Typed protocol in `contracts` (client and server over a port-like interface, Zod-validated both ways), the core as a `utilityProcess`, Electron main and preload (hardened window, replaced menu, port per page load, core restart), and a Svelte page that shows a reply from the core. `pnpm run dev` runs it.
2. Storage and logs: `node:sqlite` with numbered migrations, the event log, log files with levels and rotation.
3. App-level settings and keybinding files with schemas, read and watched by core.
4. Tokens and theming: CSS variables generated from `tokens.json`, Tailwind mapped to them, bundled Geist fonts, the first `ui` primitives.
5. Shell and dock grid: left menu, header, footer and right rail placeholders; the `dockview-core` adapter in `ui`, panels with focus, layout saved and restored.
6. Commands, keybindings with `when` contexts, and the command palette.
7. Plugin host: the second `utilityProcess`, manifest schema, `plugin-api` with commands, keybindings and panels, the plugin build, the shared-module registry, and one built-in plugin.
8. Fake ACP agent: scripted event files, core's ACP session over `@agentclientprotocol/sdk`, normalized events, a placeholder panel that streams a turn.
9. Exit check: measure launch and palette open time, add the smoke test.

Exit: the app starts, panels can be arranged and focused by keyboard, the palette runs a command from a plugin, and the fake agent streams a turn into a placeholder panel. Measure launch time and palette open time.

## M2: worktrees and chat (first product slice)
Projects, worktree create, switch and finish, setup hooks, the per-repository git queue, the first real provider end to end (Claude Code, which the M0 spike showed is better covered by ACP: `docs/decisions/0014-acp-coverage.md`), chat with composer, parallel agents, derived state with the combining rules, attention overview, session restore, permission modes, debug panel. Then the second provider, then MCP and skills per worktree. The terminal stays in M3; until then setup output and agent sign-in work without it (`docs/decisions/0023-setup-output-and-sign-in-before-the-terminal.md`).

Build order, one pull request each:
1. Projects and the git service: add a project by folder, the project list in the left menu, stored in the database; core's git service with the per-repository queue for shared-state operations.
2. Worktrees: create from the default or any branch with the naming template and default prefix, the stable `YAA_WORKTREE_INDEX`, switch by key and from the left menu with each worktree's own layout, and finish with the warnings for uncommitted or unpushed work.
3. Setup and teardown steps: files copied by glob and commands run in the worktree, output logged per worktree, a failed step sets Error.
4. Derived state: the pure reducer from events to each source's state and the combining order, with unit tests; badges in the left menu and footer, and the key that jumps to the next worktree that needs attention. The fake agent drives it until step 5.
5. Provider contribution point (plugin-api, contracts, core): detection, auth state, spawn configuration and capabilities; core starts the agent in the worktree and supervises it. The Claude Code provider plugin, with sign-in per decision 0023. The fake agent becomes a dev-mode provider behind the same interface.
6. Chat panel, replacing the placeholder: virtualized transcript with markdown, lazily highlighted code, collapsible thinking, tool calls, inline diffs and plans, rendered once per animation frame; composer with model, effort and mode pickers from config options, slash commands and attachments; the header; several chats per worktree. File paths open the editor from M3.
7. Session restore and recovery: worktrees reopen with their layout and chats, a running turn is marked interrupted, a crashed agent sets Error and resumes where the agent supports it.
8. Permission modes per worktree, shown in the chat header.
9. Debug panel: the logs with level, source and worktree filters.
10. Copilot CLI provider, including how it detects a signed-out state (`docs/decisions/0039-copilot-sign-in-state.md`).
11. MCP servers and skills per worktree (`docs/spec/09-mcp-skills.md`), with their counts in the chat header.
12. Exit check: the smoke test opens a worktree, measure worktree switch time and chat streaming.

Exit: you build yaa's next feature inside yaa. Two worktrees run real agents in parallel; one asking a permission question shows Needs attention, and a key jumps to it. Measure worktree switch time and chat streaming.

## M3: code
Editor (Monaco), files, git panel, diff, annotations (notes in diffs or code sent back to the agent), terminal, generated commit messages, text search, conflicts, rebase and stash. Dev-mode plugin hot reload and the agent-authoring tools.

Build order, one pull request each. M3 starts when M2 has met its exit check, except steps 1 to 3, built beside M2. A step can start once the steps it names under "after" are merged, so the others can be built in parallel. Each step is a built-in plugin or extends one, and adds the plugin API it needs (`docs/spec/03-plugins.md`).

1. Files panel (`docs/spec/07-editor-files-terminal.md`): the tree of the active worktree from `git ls-files` plus untracked files, kept fresh by a file watcher, with git status decorations, the ignored toggle, the fuzzy filter, and new, rename and delete. It is the first plugin that works on a worktree, so it adds the API for that: a panel knows its worktree, a UI module calls its backend and receives its events, and a backend reads worktrees and git.
2. Editor, after 1: Monaco with a theme from the tokens, tabs per worktree (preview, pinned, dirty, next, previous, close, reopen), saving, quick-open by fuzzy path, and tabs restored on start through plugin storage. Files open here at the line; the file paths in chat do once M2 step 6 renders them, through the same call.
3. Terminal, after 1: node-pty and a headless mirror per terminal in core, the xterm.js panel with its WebGL addon, several terminals per worktree with `YAA_WORKTREE_INDEX` set, re-attach after a reload, working directories restored, and the theme's terminal palette. Settle what `docs/decisions/0017-terminal-xterm-first.md` left unverified: output flow control, IME, the Kitty keyboard protocol, and CJK and emoji fallback. CI gets what node-pty needs to compile (`docs/spec/12-stack-packaging.md`).
4. Setup, teardown and sign-in in the terminal, after 3: replaces the M2 stand-ins of `docs/decisions/0023-setup-output-and-sign-in-before-the-terminal.md`.
5. Git panel and diffs, after 2 (`docs/spec/06-git-review-pr.md`): changed files as a list or a tree, staged and unstaged, stage, unstage and discard per file and folder, diffs as editor tabs, and the commit box with stage-all and commit.
6. Generated text, after 5: `complete()` on both providers, the model and prompt per task in `settings.json`, the commit box's generate button, and LLM-generated branch names for new worktrees.
7. Annotations, after 5: the editor extension contribution point (gutter actions and widgets), annotations in diffs and editor tabs stored in the database, re-anchoring with stale marking as pure functions with tests, the review panel, and the key that sends the open ones to the active chat.
8. Text search, after 2: ripgrep over the active worktree, a results panel and a key to open each hit. Decide whether ripgrep is bundled or required on the PATH.
9. Conflicts, rebase and stash, after 5 (`docs/spec/11-platform-services.md`): the conflicted files, a three-way merge in the editor, abort, continue, rebase onto the default branch, stash, and "resolve with agent". Monaco's three-way merge support is unverified: check it first and record how the merge view is built.
10. Dev-mode plugin hot reload, after 2: the watcher and incremental build in the plugin host, backend and UI swap, the error boundary keyed by plugin version, and the plugin manager panel with load errors and Svelte version mismatches. State that must survive a reload moves to plugin storage.
11. Agent-authored plugins, after 10: the user and per-project plugin folders, and the skill and tools that scaffold a plugin, read the API reference, validate it, tail its logs and return each reload's result. Decide how the tools reach the agent.
12. Settings screen, after 2 and 3 (`docs/decisions/0038-settings-screen.md`): the page rendered from setting specs that core and plugins declare, written back to `settings.json`; appearance settings over the tokens; the editor's and the terminal's settings, vim keys among them.
13. Exit check, after all the others: the smoke test opens a file, a diff and a terminal, and the worktree switch time is measured again with tabs and terminals open.

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
