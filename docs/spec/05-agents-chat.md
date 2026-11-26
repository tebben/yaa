<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Agent providers and chat

Lands in: M2. Generated text: M3. Pi, Hermes and the CLI view toggle: Later.

The chat is the app's own interface on top of an existing agent. A provider plugin connects one agent; the chat UI only ever sees a normalized event stream.

**Provider interface**

- `detect()` finds the installed agent and its version.
- `listModels()` and `thinkingEfforts(model)` fill the pickers.
- `createSession({cwd, model, effort, mcpServers, skills})` starts a session in a worktree.
- Sessions accept `send`, `cancel`, and answers to permission requests and agent questions, and emit normalized events.

* `authStatus()` and `login()` report the sign-in state and start sign-in.
* `complete(prompt, model)`, optional: a one-shot call without a chat, used for generated text. A provider that cannot do it is not offered for that setting.

The provider plugin implements detection, auth, model lists and the spawn configuration for `createSession`. Core starts the agent process from that configuration, holds the ACP connection and implements the session methods, so a plugin host crash does not end a session (see `00-overview.md`). Each provider also declares its capabilities (resume, skill toggling, MCP list, usage, effort levels), and the UI hides what a provider does not declare.

**Fake agent**

A fake ACP agent ships as a dev-only provider. It replays scripted event files (message chunks, tool calls, a permission request, usage, an error) with configurable delays. Tests use it, and developers use it to build the chat, state and workflow UI without a login or token cost.

**Transport**

Prefer the Agent Client Protocol (ACP), which the first target agents support: [Copilot CLI added ACP support in public preview in January 2026](https://github.blog/changelog/2026-01-28-acp-support-in-copilot-cli-is-now-in-public-preview/), and the [ACP agent list](https://agentclientprotocol.com/get-started/agents.md) shows Hermes Agent with native support and Pi through the pi-acp adapter. Pi also has its own RPC mode as a fallback. First providers: GitHub Copilot CLI and Claude Code, both over ACP. What each agent exposes over ACP (models, effort levels, loaded skills, usage) varies, so milestone 0 verifies it before the chat UI is built.

**Supported agents and sign-in**

- **GitHub Copilot CLI** and **Claude Code** are the first providers. Claude Code runs through [Zed's open-source adapter, which wraps the Claude Code SDK](https://zed.dev/blog/claude-code-via-acp). The adapter is published as `@zed-industries/claude-code-acp` and may have been renamed since, so milestone 0 confirms the current package.
- **Pi and Hermes** follow, as described above.
- **Sign-in:** each provider reports its auth state and, when signed out, offers a sign-in action that runs the agent's own login command in an app terminal. The app does not store agent credentials.
- **Claude subscription or API:** third-party bridges describe [running Claude Code through a logged-in `claude` CLI on a Pro or Max subscription, where an `ANTHROPIC_API_KEY` in the environment switches billing to the API](https://github.com/harukitosa/claude-code-acp). The provider therefore shows which mode is active. Whether a subscription may be used through a third-party client is a policy question to check before relying on it.

**Generated text**

Commit messages, PR descriptions and branch names come from a model the user picks per task in settings, from any added provider that supports `complete()`, for example Claude or Copilot. Each task has its own editable prompt.

**Normalized events**

Message chunk, thinking chunk, tool call (start, update, end, kind, file locations, output), plan, permission request, question, usage, turn end, error. These are also the events plugins subscribe to.

**Chat UI**

- A virtualized transcript that renders markdown, code blocks (Shiki, highlighted lazily), collapsible thinking output, tool calls with status, inline diffs and output, and plans.
- File paths and links are clickable: a path opens the file in the editor at the line, a URL opens in the browser.
- A composer with model picker, thinking-effort selector, mode, slash commands and skills list, and attachments.
- A header that always shows the active agent, model, effort, and counts of loaded skills and MCP servers, so hidden state is never a surprise.
- Several chats per worktree. Chat events drive the worktree state badge (Running, Needs attention, Error).

**Chat view: our interface or the agent's CLI**

- Each chat has a toggle between our interface, over ACP, and the agent's own terminal UI, which runs in an app terminal in the worktree.
- Switching is a handoff: the active view closes and the same agent session resumes in the other view where the agent supports resuming. Where it does not, the toggle starts a new chat and says so. Resume support is checked per agent in milestone 0.
- In CLI view the app gets no normalized events, so worktree state, attention and usage are limited to what the process and the agent's own files reveal. [claude-code-cli-acp runs the real Claude Code CLI in a PTY and reads its transcript to serve ACP](https://docs.rs/crate/claude-code-cli-acp/0.1.1), which is one possible way to keep both views on one session.

**Extension through plugins**

A chat renderer registry lets a plugin render a specific tool-call kind or message part. Event subscriptions let a plugin react to an agent question by opening a dedicated questionnaire panel, or show the skills an agent loaded in its own panel.
