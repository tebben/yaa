<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## MCP servers and skills per worktree

Lands in: M2, after the second provider.

The user can switch MCP servers and skills off for one worktree in one place, without editing agent config files (`docs/decisions/0040-switching-mcp-servers-and-skills.md`).

- **Discovery:** the provider reports the MCP servers and skills visible to the agent at user, project and worktree level: the agent's config for the user, its config for this repository, and files in the worktree's folder. It asks the agent where it can report them and scans its known locations otherwise. One the agent's own configuration leaves out, such as a rejected `.mcp.json` server, shows as off with no switch. A config file that cannot be read fails that provider's list, and the start of its chats, with the file's name.
- **Claude Code:** the provider reads `~/.claude.json`, the worktree's `.mcp.json`, the settings files and the skill folders under `~/.claude/skills` and the worktree's `.claude/skills`. A skill goes by its folder's name. MCP servers and skills from Claude plugins and claude.ai connectors are not listed and always load.
- **Copilot CLI:** the provider asks the CLI (`copilot mcp list`, `copilot skill list`), which leaves out the `.mcp.json` servers of a folder the user does not trust.
- **Panel:** the built-in `mcp-skills` plugin shows two lists, merged by name across providers, with a toggle per item and enable all, disable all and reset per list. Settings layer as global default, then project default, then worktree override, and the most specific wins; at one layer an item's own setting wins over the whole list's. The panel edits one layer at a time and says where a row's state comes from and when a more specific layer overrules it. They are stored in the app's database, not in the repository. Read again (also a command) rereads what the providers find, and a command picks the layer.
- **Applying:** when core opens or resumes a session, it asks the provider what the agent would load and tells it the names switched off. The agent keeps loading its own configuration. A provider declares whether it can switch off MCP servers and whether it can switch off skills: Claude Code does both, through settings passed in ACP session setup, and Copilot CLI only MCP servers, through `--disable-mcp-server`. The toggle is hidden where no provider that finds the item can honor it, and a row names the providers that load it anyway.
- **When it takes effect:** at the next session or after restarting the chat's agent (a chat panel command, refused while a turn runs), and the panel says so.
- **Visibility:** the chat header shows how many MCP servers and skills the chat's agent started with, of those the provider lists.
