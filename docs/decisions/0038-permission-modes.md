# 0038 Permission modes per worktree, applied through a config option

Status: decided, 2026-11-27.

Context: M2 step 8 gives each worktree a permission mode (ask for everything, ask for risky actions, allow all), applied through the provider where the agent supports it and shown in the chat header (`docs/spec/11-platform-services.md`). Neither agent has a permission setting of its own in ACP: both carry it in session config options, and they name it differently (`docs/decisions/0014-acp-coverage.md`). The Claude adapter's `mode` option is its permission mode (`default` "Manual", `acceptEdits`, `plan`, `auto`, `bypassPermissions`); `auto` falls back to `acceptEdits` on a model without it, and `bypassPermissions` is offered only where the adapter allows it, not when run as root. Copilot CLI has a separate `allow_all` option (`off`, `auto`, `on`) beside its `mode`.

Versions: `@agentclientprotocol/claude-agent-acp` 0.112.0, Copilot CLI 1.0.115 (from 0014).

Decision:
- **Stored per worktree** in the database, `ask` for a new one and for the main checkout. The worktree carries it in the protocol; the palette's "Set permission mode" sets it for the open worktree.
- **Mapped in the manifest.** A provider entry may declare `permissionModes`: the config option that carries them and, per mode, the values that mean it, best first. Claude: `mode`, with `default`; `auto`, then `acceptEdits`; `bypassPermissions`. Data, not a backend call, so core and the chat read it without the plugin host.
- **Core applies it** when a chat's agent starts or resumes, before the session is handed out, and to the running agents of the worktree when its mode changes. It sets the first value the agent offers. When the agent offers none, as `bypassPermissions` as root, the agent stays in its mode and core logs a warning; the header shows the mode the agent is really in. A failure to set it fails the start.
- **The header shows the agent's actual mode**, read back through the mapping: the yaa name when its value means a mode, the agent's own name otherwise, such as Plan. The composer's mode picker still offers every mode the agent has, so a chat can plan or change its own mode until its agent next starts or the worktree's mode changes.
- Rejected: core answering permission requests by itself to enforce the modes. An agent asks only for what its own mode does not allow, so core cannot make it ask for more, and the agents already classify risk (Claude's `auto`).
- Rejected: replacing the composer's mode picker with the three yaa modes, which would lose the agent's plan mode.

Consequences: a provider without `permissionModes` runs in its own mode whatever the worktree's, and its header shows the agent's name for it. The Copilot provider (M2 step 10) maps `allow_all`. A chat whose agent changed its own mode, as Claude does when a plan is accepted, keeps that mode until the worktree's mode is applied again.
