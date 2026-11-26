<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## MCP servers and skills per worktree

The user can switch MCP servers and skills off for one worktree in one place, without editing agent config files.

- **Discovery:** the provider reports the MCP servers and skills visible to the agent at user, project and worktree level. Where an agent does not report them, the provider scans its known locations.
- **Panel:** two lists with a toggle per item and a disable-all per list. Settings layer as global default, then project default, then worktree override, and the most specific wins. They are stored in the app's config, not in the repository.
- **Applying:** at session creation the app passes only the enabled MCP servers to the agent; ACP session setup accepts a list of them, which is confirmed per agent in milestone 0. Skills depend on how each agent loads them, so each provider declares a capability: it can toggle skills (for example through a filtered skills directory or a config option), or the list is read-only. The toggle is hidden where the agent cannot honor it.
- **When it takes effect:** at the next session or after restarting the chat, and the panel says so.
- **Visibility:** the chat header shows the effective counts of active skills and MCP servers.
