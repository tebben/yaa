# 0040 Switching MCP servers and skills

Status: decided, 2026-11-27. Supersedes "counts the servers yaa passes in" in `0014-acp-coverage.md`.

Context: M2 step 11 switches MCP servers and skills off per worktree. The spec had yaa pass only the enabled servers in ACP session setup, which means turning off the agent's own configuration and rebuilding it.

Versions: Claude Code 2.1.332 behind `@agentclientprotocol/claude-agent-acp` 0.112.0 (`@anthropic-ai/claude-agent-sdk` 0.3.331), GitHub Copilot CLI 1.0.116, Linux.

Checked, with throwaway stdio servers that record that they started, and the slash commands each session announced:
- Claude: `_meta.claudeCode.options.settings` with `deniedMcpServers: [{serverName}]` keeps a server from starting, whatever characters its name has, and `skillOverrides: {name: "off"}` removes a skill. The key is the skill's folder name, not its front matter's `name`.
- Claude: user servers (`~/.claude.json`), the repository's own (`projects[<main checkout>]`, used in its worktrees too, while an entry for a worktree's folder is ignored) and `.mcp.json` all load. `.mcp.json` servers load without an approval; `disabledMcpjsonServers` in the user, project or local settings, the main checkout's local settings included, keeps one out.
- Copilot: `--acp --disable-mcp-server <name>` keeps a server from starting. An untrusted folder's `.mcp.json` servers do not load, and `copilot mcp list` leaves them out too. Skills load in untrusted folders. Skills are turned off only by `disabledSkills` in Copilot's own or the repository's settings.
- Copilot: `copilot -C <folder> mcp list --json` and `skill list --json` report every source, plugins and built-ins included, with an `enabled` flag, in under a second.

Decision:
- yaa denies what is switched off and leaves each agent loading its own configuration. Rejected: passing only the enabled servers (`strictMcpConfig` for Claude), which has yaa expand variables and apply approvals itself and loses plugin servers and claude.ai connectors.
- Claude Code is toggled through those settings, Copilot CLI through the flag. Copilot's skills are read-only: switching them off would mean editing agent config files.
- The header counts what discovery finds minus what is switched off, taken when the session opens.
- Claude's plugins and claude.ai connectors are not listed: their layout is the CLI's own, and they load as the user set them up.
- The toggles are app state in SQLite, per layer, and go with their project or worktree. Rejected: the JSON settings files (`0020-settings-files-json.md`), as a name per worktree is not something to edit by hand.

Consequences: a provider reads discovery from files or the CLI, so a new agent version can move them; the checks above are the ones to repeat. Discovery does not follow `CLAUDE_CONFIG_DIR`, and does not read `.mcp.json` above the worktree's folder. Toggles go by name, so a skill the two agents name differently shows as two rows.
