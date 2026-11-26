# 0014 ACP coverage of Copilot CLI and Claude Code

Status: decided, 2026-11-26. M0 spike, branch `spike/acp` (probe scripts in `spikes/acp/`, kept for reference, not merged).

Context: the chat header, the generated-text setting and the provider capabilities depend on what each agent exposes over ACP (`docs/spec/05-agents-chat.md`). The spike drove both agents from a raw JSON-RPC client over stdio and logged every message.

Versions: ACP protocol v1, `@agentclientprotocol/sdk` 2.12.0, `@agentclientprotocol/claude-agent-acp` 0.112.0 (wraps `@anthropic-ai/claude-agent-sdk` 0.3.331) with Claude Code 2.1.332, GitHub Copilot CLI 1.0.115 (`copilot --acp`), Node 24.9, Linux.

## Findings

The Claude adapter was renamed: `@zed-industries/claude-code-acp` and `@zed-industries/claude-agent-acp` are deprecated in favour of `@agentclientprotocol/claude-agent-acp` (binary `claude-agent-acp`). The SDK moved from `@zed-industries/agent-client-protocol` to `@agentclientprotocol/sdk`.

| Question | Claude Code (adapter) | Copilot CLI |
| --- | --- | --- |
| Models | config option, category `model`, 14 values incl. aliases (`default`, `opus`, `sonnet`, `haiku`) | config option, category `model`, plus a legacy `models` block; each model's `_meta` has a premium-request multiplier (`copilotUsage: "15x"`) |
| Thinking effort | config option `effort`, category `thought_level`: `default, low, medium, high, xhigh, max` | config option `reasoning_effort`, category `thought_level`; the levels change per model (`none` for some, the option is absent for Haiku 4.5 and setting it errors) |
| Effort follows model | yes: the `set_config_option` response returns the new option list (`fast` disappears for Haiku) | yes, same mechanism; some models add `contextTier` |
| Modes | `default` (manual), `acceptEdits`, `plan`, `auto`, `bypassPermissions` | `agent`, `plan`, `autopilot`, plus `allow_all`: `off`, `auto`, `on` |
| Skills | `available_commands_update`, mixed with built-in commands; project skills marked `(project)` in the description; invoking `/name` runs the skill | same update, mixed with built-in commands; skills only recognisable by the input hint `instructions for the skill`; `/name` works. Reads `.github/skills` and `.claude/skills` |
| Skill toggling over ACP | no | no |
| MCP servers passed in `session/new` | yes (stdio, http, sse); tool calls carry `_meta.claudeCode.mcpServer` | yes (stdio, http, sse); tool named `<server>-<tool>` |
| Agent's own MCP config reported | no | no (user-configured servers show up only as tools) |
| Usage | `usage_update` with context `used`/`size`, cumulative `cost` in USD, rate-limit windows in `_meta`; per-turn tokens in the prompt response (unstable `usage`) incl. cache read/write | `usage_update` with `used`/`size`, no cost; per-turn tokens in the prompt response incl. thought tokens |
| Permission requests | `session/request_permission` with allow once, allow always (with the rule it adds) and reject; tool call has `locations` | same method, allow once, allow always (not for shell), reject |
| Agent questions | `elicitation/create` form (unstable), when the client advertises `elicitation.form`; AskUserQuestion becomes a `oneOf` field plus a free-text field | `elicitation/create` form, `ask_user` tool, `enum` field |
| Cancel | `session/cancel`, turn ends `cancelled` within 10 ms | same, within 10 ms; adds a message chunk "Info: Operation cancelled by user" |
| Session list | `session/list`, filtered by `cwd`, with titles | same |
| Resume after a process restart | `session/resume` (no replay, about 1.8 s) and `session/load` (replays history); context kept | `session/load` only (replays history, about 2.1 s); `session/resume` is "Method not found"; context kept |
| Close / delete | `session/close`, `session/delete` | `session/close`, no delete |
| Same session in the CLI | `claude --resume <acp session id>` continues it | `copilot --resume <acp session id>` continues it |
| Auth status | `auth/status` (unstable): state plus account, with `kind: account` and the plan, or `kind: api_key` when `ANTHROPIC_API_KEY` is set. No auth methods advertised | no `auth/status`; `authMethods` has a terminal method whose `_meta` gives the login command (`copilot login`) |
| Login command | `claude auth login` | `copilot login` |
| One-shot `complete()` | yes: new session, one prompt, close. 1.6 s from process start, 1.2 s for the prompt (Haiku 5.5). `claude -p` is about 2.3 s | yes: 6.9 s from process start, 6.1 s for the prompt (Haiku 4.5, which thinks). `copilot -p` is 8.3 s |
| Startup | `initialize` 0.2 s, `session/new` 0.45 s | `initialize` 1.8 s, `session/new` 1.5 s |

Other findings:
- A session without a prompt is not persisted on either agent, so an empty `session/new` reads the model list without leaving a trace in history. Sessions with a prompt, one-shots included, show up in `session/list` and in the agents' own history.
- Many of the features above are in the SDK's unstable v1 entrypoint (`@agentclientprotocol/sdk/unstable`): usage in the prompt response, elicitation, `auth/status`, resume, delete. ACP v2 is in preview and was not used.
- Copilot with Claude Haiku 4.5 claimed to call the MCP tool and ran `echo pong` instead; with its default model it called the tool. This is model behaviour, not an ACP gap.
- Not verified: the signed-out behaviour of either agent (both were signed in), whether a Claude subscription may be used through a third-party client (policy, still open), and usage reporting with API-key billing.

## Decision

- Both agents are reached over ACP v1 with `@agentclientprotocol/sdk`, using its `/unstable` entrypoint, and capabilities are checked from `initialize` per agent. Claude Code runs through `@agentclientprotocol/claude-agent-acp`.
- Models, effort levels and modes come from the session's config options, by category, not from a separate provider call. The pickers re-render on every `config_option_update` and `set_config_option` response, because effort levels depend on the model.
- M2 starts with Claude Code: it covers resume without replay, auth status with billing mode, cost, delete and a fast one-shot. Copilot CLI is the second provider.
- Both providers support `complete()`. One-shots run in a scratch directory owned by the app, so they do not appear in a worktree's session list, and they are deleted afterwards where the agent supports delete.
- The MCP count in the chat header counts the servers yaa passes in. The agents' own MCP configuration is not reported over ACP, so discovery scans config files (`docs/spec/09-mcp-skills.md`).
- Skill toggling is not available over ACP for either agent. The skills list is read from `available_commands_update` and from the skill folders.

## Consequences for M1

- The fake ACP agent emits the update kinds seen here: message, thought, tool call and update, plan, `available_commands_update`, `config_option_update`, `session_info_update` (title), `usage_update`, permission requests and elicitations.
- The normalized event set gains session title and available commands, and usage carries context size and optional cost.
- Answering agent questions means implementing ACP form elicitation (JSON Schema with `enum` or `oneOf` and free-text fields) and advertising `elicitation.form`.
- The CLI view toggle (Later) can hand off by session id on both agents.
