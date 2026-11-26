# AGENTS.md

Read `docs/README.md` first; it says which doc wins and where each topic lives.

## Commands
Toolchain not created yet (see docs/plan.md "Before M0"). Placeholders until then:
- Install: `pnpm install`
- Dev: `pnpm run dev`
- Full check, run before finishing: `pnpm run check`
- Package for Linux: `pnpm run package:linux`

## Architecture
- Backend owns agents, git and plugins; the UI only subscribes. See docs/spec/00-overview.md.
- Every package and plugin is a deep module: import entry points only.
- Agents are reached through ACP behind one provider interface (docs/spec/05-agents-chat.md).
- Worktree state (Idle, Running, Needs attention, Error, Done) is derived from events, never stored by hand.

## Where to look
- What to build: docs/spec/ (index in docs/README.md)
- How it looks: docs/design/ui.md and tokens.json. Mockups are a guide, not a spec; do not copy their markup.
- What next: docs/plan.md. Open questions: docs/decisions/.

## Rules: read the relevant one before editing
- TypeScript: docs/rules/typescript.md
- Svelte: docs/rules/svelte.md
- Plugins: docs/rules/plugins.md
- Testing: docs/rules/testing.md
- Docs, specs and decisions: docs/rules/docs.md
(The code rules are written during repo foundation; until then follow docs/spec/13-repo-conventions.md.)

## Change style
- Smallest change that solves the task; no redesigns.
- Extend an existing primitive before writing a new one; no duplicated code.
- Colours and spacing come from tokens, never literals; icons from @lucide/svelte.
- Keep .svelte files thin: logic in .svelte.ts controllers or pure .ts.
- Tests only for pure logic, contracts and the workflow engine; no component or wiring tests.
- Behaviour change: update the owning spec in the same commit. Never change a decided item without asking.
- Do not invent package names, APIs or sources; verify against docs or the registry, and say when unsure.
