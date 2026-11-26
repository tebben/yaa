<p align="center"><img src="docs/design/brand/banner.png" alt="yaa: parallel coding agents in git worktrees, run from the keyboard" width="100%"></p>

# yaa

Parallel coding agents in git worktrees, run from the keyboard. A worktree-first, keyboard-first agentic IDE for desktop (Linux x64 first). The name stands for "yet another ADE, but mine" and is pronounced "ja".

Run many agents in parallel git worktrees, see which need attention, review diffs with annotations, and automate flows from issues to PRs, with a full IDE feel (editor, files, terminal) instead of a chat wrapper.

## Status
Pre-code. Spec and design are in `docs/`; start with `docs/README.md` and `docs/plan.md`.

## Stack
Electron, Svelte 5, Bits UI, Tailwind, Monaco, a TypeScript backend process behind a typed protocol, agents via ACP (Copilot CLI, Claude Code, Pi, Hermes).

## Develop
Commands are filled in once the toolchain exists (see `AGENTS.md`).

## Docs
`docs/README.md` is the index.

## Licence
MIT, see `LICENSE`.
