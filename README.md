<p align="center"><img src="docs/design/brand/banner.png" alt="yaa: parallel coding agents in git worktrees" width="100%"></p>

# yaa

Parallel coding agents in git worktrees. A worktree-first, keyboard-first agentic IDE for desktop (Linux x64 first). The name stands for "yet another ADE, but this one is mine".

Run many agents in parallel git worktrees, see which need attention, review diffs with annotations, and automate flows from issues to PRs, with a full IDE feel (editor, files, terminal) instead of a chat wrapper.

## Status
Early M1: an Electron window that talks to the core process. Spec and design are in `docs/`; start with `docs/README.md` and `docs/plan.md`.

## Stack
Electron, Svelte 5, Bits UI, Tailwind, Monaco, a TypeScript backend process behind a typed protocol, agents via ACP (Copilot CLI, Claude Code, Pi, Hermes).

## Develop
Requires Node 24 and pnpm (version pinned in `package.json`).

```sh
pnpm install
pnpm run dev        # the app in dev mode, with hot reload (the first run downloads Electron)
pnpm run check      # lint, typecheck, boundaries, docs, tests of changed packages
pnpm run check:all  # everything, as CI runs it
```

Packaging for Linux arrives in M6.

## Docs
`docs/README.md` is the index.

## Licence
MIT, see `LICENSE`.
