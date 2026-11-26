<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Overview

Lands in: M1; the goals and working principles guide every milestone.

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

- Iterative: ship a thin vertical slice first (see `docs/plan.md`), then widen.
- No duplication: one primitive per job, composed upward; extract on the second use.

## Architecture

Lands in: M1.

The UI is a thin client: a separate backend process owns worktrees, agents, git and plugins, and the UI subscribes to its events.

```mermaid
flowchart LR
  main[Electron main: window, starts core]
  renderer[Renderer: Svelte UI]
  core[Core: state, event bus, git, workflows, supervisor]
  host[Plugin host: backend plugin code]
  agents[Agent processes, one per chat session]
  ptys[PTYs, one per terminal]
  db[(SQLite)]
  main -->|forks, brokers ports| core
  main -->|forks| host
  renderer <-->|typed protocol| core
  core <-->|typed RPC| host
  core <-->|ACP over stdio| agents
  core <--> ptys
  core --> db
```

- **Renderer:** sends commands and renders events. It keeps no business state, so a reload or a second window sees the same state.
- **Core:** owns state and the event bus. Plugin code runs in its own host process, so a crashing plugin does not stop the core or the agents.
- **Agents and terminals:** core spawns, supervises and talks to every agent process and PTY, one agent per chat session, started in its worktree directory. A provider plugin supplies detection, spawn configuration and capability data, but never holds the process or the ACP connection. A plugin host crash therefore leaves running agents and terminals untouched. Electron's main process only creates the window, forks the core and plugin host, and hands out ports.
- **Contracts:** one typed protocol package shared by the UI, the core and the plugin API. Every message, plugin manifest and settings file has a runtime schema in this package, and the core validates input from the renderer, plugins and disk against it. TypeScript types are inferred from the schemas, so there is one definition per message.

**Transport (decided, see `docs/decisions/0018-core-transport-messageport.md`)**

The core can run shell commands, so the channel to it must not be open to other local processes or to web pages.

- The core runs as an Electron `utilityProcess`. Each page load gets its own `MessagePort` to it, which main creates on the preload's request. No network port is opened and there is no WebSocket.
- The plugin host is a second `utilityProcess`. The core's supervisor decides when to start or restart it; main forks it and brokers a `MessagePort` between the two.
- Main stays out of the data path: it forks processes, hands out ports and restarts the core when it exits.
- The renderer runs with context isolation on, the sandbox on, `nodeIntegration` off and a strict content security policy: scripts only from the app, no permissions for web content, no navigation away from the app's origin. Inline styles are allowed, because Svelte transitions and dockview set them. The built renderer is served from `yaa://app/`, so it has a real origin. The preload's only job is handing the page its port: the page asks by posting a message to its own window, and the preload answers with the port the same way. It exposes nothing through `contextBridge`, so page scripts have no bridge API to call.
