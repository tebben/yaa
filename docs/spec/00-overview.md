<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Overview

A keyboard-first desktop IDE where every unit of work is a git worktree with its own agent chat, diff review, terminal and cost counter. The core stays small; almost everything else (git panel, PR/MR, Jira, chat extras) is a plugin built on the same API that third parties and agents use.

**Goals**

- Fast: the UI never blocks on agents, git or the network; panel and worktree switches feel instant.
- Keyboard-navigable everywhere, with an optional vim layer, but a graphical grid UI and not a TUI.
- Worktree-first: projects show their default branch and worktrees; creating, switching and closing worktrees is the main flow.
- Simple and beautiful: a small set of design tokens and a small set of reusable components.
- Extensible: plugins add panels, header and footer items, commands, settings, connectors and agent providers, expose functions to other plugins, and can be written by an agent and hot-reloaded in dev mode.

**Non-goals for v1**

- Not a VS Code replacement: no debugger, no VS Code extension compatibility, no language features beyond what Monaco provides.
- No hosted service: everything runs locally.
- No custom agent: the app drives existing agents, GitHub Copilot CLI and Claude Code first, then Pi and Hermes.

**Working principles**

- Iterative: ship a thin vertical slice first (see Milestones), then widen.
- No duplication: one primitive per job, composed upward; extract on the second use.

## Architecture

The UI is a thin client: a separate backend process owns worktrees, agents, git and plugins, and the UI subscribes to its events.

&#91;embedded content: architecture · 3 layers, 4 links\]

- **Renderer:** sends commands and renders events. It keeps no business state, so a reload or a second window sees the same state.
- **Core:** owns state and the event bus. Plugin code runs in its own host process, so a crashing plugin does not stop the core or the agents.
- **Agents:** one process per chat session, started in its worktree directory. Electron's main process only creates the window and starts the backend.
- **Contracts:** one typed protocol package shared by the UI, the core and the plugin API.
