<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Repository layout and module boundaries

Lands in: before M0 (repo foundation).

One monorepo, pnpm with workspaces, strict TypeScript, Biome for lint and format, Vitest for tests. Layout:

```text
apps/
  desktop/        Electron main process and packaging
  web/            Svelte renderer
packages/
  core/           worktrees, git, event bus, plugin manager
  contracts/      shared types, runtime schemas and the core protocol
  plugin-api/     the typed API plugins import
  ui/             design tokens and Bits UI wrappers
plugins/          built-in plugins: git, chat, files, terminal, github, jira, pr
docs/             architecture notes and rules
AGENTS.md  README.md
```

**Deep modules**

The repo adopts Matt Pocock's [setup-ts-deep-modules skill](https://skills.sh/mattpocock/skills/setup-ts-deep-modules), whose aim is to make every package [a lot of behaviour behind a small interface](https://skills.sh/mattpocock/skills/setup-ts-deep-modules). As described in its [listing](https://mcpservers.org/agent-skills/mattpocock/setup-ts-deep-modules), it wires dependency-cruiser into the repo so that:

- a package's public surface is its entry-point files at the package root, and a package can expose several (`index.ts`, `client.ts`, `server.ts`) instead of one giant index;
- everything in subfolders is hidden and cannot be imported from outside;
- tests import only entry points, and dependency cycles are not allowed;
- a `lint:boundaries` script enforces this, and the skill proves the rules work by adding a deliberate violation and checking that the script fails.

The skill sits in the `in-progress` folder of its repository, so expect it to change. A copy pinned to an upstream commit lives in `.claude/skills/setup-ts-deep-modules` (see `.claude/skills/README.md`), and the repo owns the rules it produces.

How it maps here: every workspace package and every plugin is a deep module. A plugin exposes only its manifest and entry modules, so one plugin cannot reach into another's internals and must use exposed services. The skill's default packages root may need adjusting to this layout. `AGENTS.md` links to the packages README, so an agent finds the boundary rule before it trips over it.

## Svelte structure: thin components

Lands in: before M0 (repo foundation).

A `.svelte` file holds markup, wiring and style hooks. Behavior lives in modules beside it. Svelte supports this directly: [`.svelte.ts` files behave like ordinary modules but can use runes](https://svelte.dev/docs/svelte/svelte-js-files), so reactive state leaves the component. Such modules cannot export reassigned state, so they export factories or objects with getters and named methods. The same idea as [keeping feature pages thin and extracting pure logic early](https://skillsmp.com/creators/hiro-league/hiroleague/claude-skills-svelte-best-practice).

Shape of a feature folder:

```text
worktree-switcher/
  WorktreeSwitcher.svelte        composition root: wires the controller to the parts
  WorktreeList.svelte            presentational part: props in, callbacks out
  WorktreeRow.svelte
  worktree-switcher.svelte.ts    controller: reactive state and actions, a factory
  worktree-order.ts              pure logic: sorting, filtering, mapping
  index.ts                       entry point, the deep-module boundary
```

**Rules**

1. Three layers. Pure `.ts` has no runes and is tested without Svelte. `.svelte.ts` controllers own state, derived values and actions, and talk to the typed client. `.svelte` files render and bind.
2. The composition root creates the controller and hands slices to children. Leaf components are presentational and never do IPC.
3. Components never touch the transport (WebSocket, `MessagePort` or IPC) directly; they go through a controller and the typed client from `contracts`.
4. Components use `ui` primitives, never Bits UI directly, and tokens for every color and spacing value.
5. Size trigger: a `.svelte` file over about 150 lines, or a `<script>` block over about 40, is a prompt to split. These numbers are proposals; the check starts as a warning in CI, not a failure.
6. Compose with snippets and `children`. Use context only for app-wide things, not to avoid passing props one level.
7. Extract on the second use, to `ui` or the feature folder. No speculative generalization.

**A repo skill for it**

Like the deep-modules skill, the repo carries its own `setup-svelte-structure` skill. It writes these rules into `docs/rules/svelte.md`, adds a `lint:svelte-size` script, and adds dependency-cruiser rules: leaf components cannot import the transport client, and pure `.ts` modules cannot import `.svelte` files. Like the deep-modules skill, it proves the rules work by adding a deliberate violation and checking the check fails. Whether dependency-cruiser follows imports inside `.svelte` files in this setup needs checking when the skill is written.

## README, AGENTS.md and rules

Lands in: before M0 (repo foundation).

Three kinds of file, each with one job and no overlap.

| File | Audience | Holds | Limit |
| --- | --- | --- | --- |
| `README.md` | people | what it is, requirements, run in dev, build and package for Linux, where the docs are, plugin quick start, license | about 60 lines |
| `AGENTS.md` | agents | commands, architecture pointers, the rules agents break, links to rules | under 100 lines |
| `docs/rules/*.md` | agents and people | one topic per file, imperative and specific | one screen each |

**AGENTS.md**

- [AGENTS.md is read by most major coding agents](https://addyosmani.com/agents/15-agents-md/), so it is the single source; a tool that does not read it gets a one-line pointer file, for example a `CLAUDE.md` that imports it.
- Keep it to what an agent cannot infer from the repo. [Unnecessary requirements make tasks harder, raising reasoning tokens by 14 to 22 percent](https://www.philschmid.de/writing-good-agents), so no vague advice like "write clean code", and no file tours.
- One public guide suggests [under 60 lines and never over 100](https://skills.sh/getsentry/skills/agents-md). We use that as the cap.
- Add a nested `AGENTS.md` only where a subtree differs, such as `plugins/` or `packages/ui`. The closest file to the edited code wins.
- It grows by incident: when an agent makes a repeatable mistake, add a line or a rules link.

The repo's own `AGENTS.md` at the root is the current version; edit it there rather than keeping a skeleton here.

**Rules and conventions**

- `typescript.md`: strict mode; no `any`, use `unknown` and narrow; named exports; no barrel files except package entry points; no deep imports across packages; one concept per file; small functions, pure where possible; no dead code; no comments that restate the code; validate and narrow data with Zod where it crosses a boundary (protocol, plugin host, disk, agent output, CLI output) and trust the types inside, with no repeated checks.
- `svelte.md`: the rules in the previous section.
- `plugins.md`: manifest fields, contribution points, tokens only, dispose everything registered, expose functions as services.
- `testing.md`: tests import entry points only; test pure logic, contracts and the workflow engine, not components or wiring; use a fake agent, not a real one; the default check runs only the changed packages. See Testing strategy below.
- `docs.md`: how specs, decisions and the plan are changed. This file exists before the foundation.
- Commits: conventional commit messages and small commits. A change is done when `check` passes: lint, typecheck (`tsc` for `.ts`, `svelte-check` for `.svelte`, since `tsc` does not read Svelte files), boundaries, Svelte size warning, unit tests.
- Biome's support for `.svelte` files is partial and depends on the version; what the installed version lints and formats is in `docs/rules/svelte.md`.
- Rules that agents tend to bend are enforced by `check`, not only written down. Lint fails on explicit `any`, on non-null assertions, and on suppression comments (`biome-ignore`, `@ts-ignore`, `@ts-expect-error`) that give no reason. The mapping to Biome, TypeScript and the repo scripts, and what stays review-only, is in `docs/rules/typescript.md`.
- `check:docs`, a small script, fails when a spec `##` section has no `Lands in:` line, a `docs/` path mentioned in a doc does not exist, or a spec file is missing from the index in `docs/README.md`.

## Testing strategy: lean on purpose

Lands in: before M0 (repo foundation).

The goal is a fast loop, not coverage. Agents tend to write many tests and run all of them on every change, so the repo sets the policy explicitly.

- **What gets tests:** pure logic (naming, ordering, annotation anchoring, cost calculation, workflow context and templating), protocol contracts, and the workflow engine's state transitions. These are cheap and catch real bugs.
- **What does not:** Svelte components, wiring, and thin controllers. No snapshot tests, no test per component, no tests that restate the implementation.
- **Fakes over real agents:** a fake ACP agent that replays scripted events lets the chat, state and workflow logic be tested without a model.
- **Three tiers, run differently:** the default `check` runs lint, typecheck, boundaries and unit tests for the packages that changed. A small smoke suite (app starts, a worktree opens, a fake chat turn renders) runs in CI and on demand. End-to-end runs only before a release.
- **Changed packages:** `check` selects packages with pnpm's filter against the main branch, `pnpm -r --filter "...[origin/main]" --filter "!yaa"`, which also includes packages that depend on a changed one and leaves out the workspace root. Confirmed on pnpm 12: committed, staged and modified files count, new untracked files do not. `check:all` runs everything and is what CI runs.
- **Rules for agents:** do not add a test unless the change touches the logic above or fixes a bug that deserves a regression test; never run the whole suite when a package filter exists; the test counts and runtime budget go in `docs/rules/testing.md`.
