<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Agent providers and chat

Lands in: M2. The fake agent, core's ACP session and the normalized events: M1. Generated text: M3. Pi, Hermes and the CLI view toggle: Later.

The chat is the app's own interface on top of an existing agent. A provider plugin connects one agent; the chat UI only ever sees a normalized event stream.

**Provider interface**

- `detect()` finds the installed agent and its version.
- `createSession({cwd, model, effort, mode, mcpServers, skills})` starts a session in a worktree.
- Sessions accept `send`, `cancel`, config changes (model, effort, mode), and answers to permission requests and agent questions, and emit normalized events.
- Models, effort levels and modes come from the session's ACP config options, grouped by category (`model`, `thought_level`, `mode`). Effort levels depend on the model, so the pickers follow every config update from the agent. Before a chat exists, for example in settings, core opens a session without a prompt to read them; neither agent persists such a session (`docs/decisions/0014-acp-coverage.md`).

* `authStatus()` and `login()` report the sign-in state and start sign-in.
* `complete(prompt, model)`, optional: a one-shot call without a chat, used for generated text. A provider that cannot do it is not offered for that setting.

The provider plugin implements detection, auth and the spawn configuration for `createSession`: either a command on the machine or the plugin's own agent module (`docs/decisions/0032-agent-providers.md`). Core starts the agent process from that configuration in the worktree, with `YAA_WORKTREE_INDEX` set, holds the ACP connection and implements the session methods, so a plugin host crash does not end a session (see `00-overview.md`). Each provider also declares its capabilities in its manifest (resume, skill toggling, MCP list, usage, effort levels), and the UI hides what a provider does not declare, and how its agent takes the worktree's permission mode (see `11-platform-services.md`). A provider is ready for a chat when its agent is installed and not known to be signed out; a sign-in state it cannot read does not block.

**Supervision**

Core logs what an agent writes to stderr. An agent that ends while its session is open, between turns too, fails the session with how it ended and its last 20 lines, which sets the worktree to Error, and the chat's next prompt starts it again and resumes the session (`11-platform-services.md`); one that ends while the session opens fails the start with the same. Finishing a worktree, removing its project or quitting yaa ends the agent and every process it started in its process group.

**Fake agent**

A fake ACP agent ships as a dev-only provider (the `fake-agent` plugin over `packages/fake-agent`). It replays scripted turn files (message and thinking chunks, markdown with code split across chunks, a plan, tool calls with output and a diff, a permission request, a question, the session title, usage, and a turn that fails), offers a model, effort and mode to pick, of which the small model has no effort levels and the modes include one for each permission mode, takes images and resumes any session, keeping no context, each step with its own delay. The scripts are TypeScript typed against the ACP SDK's types, and each is a slash command: a prompt naming one plays it, any other prompt plays the default. Core runs it as a process over stdio, as a real agent runs; tests connect to it in-process with the delays scaled to zero. Developers use it to build the chat, state and workflow UI without a login or token cost.

**Transport**

Prefer the Agent Client Protocol (ACP), which the first target agents support: [Copilot CLI added ACP support in public preview in January 2026](https://github.blog/changelog/2026-01-28-acp-support-in-copilot-cli-is-now-in-public-preview/), and the [ACP agent list](https://agentclientprotocol.com/get-started/agents.md) shows Hermes Agent with native support and Pi through the pi-acp adapter. Pi also has its own RPC mode as a fallback. First providers: GitHub Copilot CLI and Claude Code, both over ACP. Core speaks ACP v1 through `@agentclientprotocol/sdk`, using its unstable entrypoint, because usage per turn, agent questions, auth status and resume are unstable features. What each agent exposes varies; the M0 results per agent are in `docs/decisions/0014-acp-coverage.md`.

**Supported agents and sign-in**

- **Claude Code** and **GitHub Copilot CLI** are the first providers, in that order. Claude Code runs through the open-source adapter `@agentclientprotocol/claude-agent-acp` (formerly `@zed-industries/claude-code-acp`), which wraps the Claude Agent SDK. Copilot CLI runs as `copilot --acp`.
- **Pi and Hermes** follow, as described above.
- **Sign-in:** each provider reports its auth state and, when signed out, offers a sign-in action that runs the agent's own login command in an app terminal (`claude auth login`, `copilot login`). In M2, before the terminal, the chat shows the command to run and a button that checks again (`docs/decisions/0023-setup-output-and-sign-in-before-the-terminal.md`). The app does not store agent credentials. The Claude provider reads the state from `claude auth status --json`. Copilot CLI has no way to report it short of opening a session, so its provider reports it as unknown; signed out, the agent refuses the session with ACP's `auth_required` error, and core fails the start with the agent's own sign-in instructions from its auth methods (`docs/decisions/0038-copilot-sign-in-state.md`).
- **Claude subscription or API:** a logged-in `claude` CLI runs on the Pro or Max subscription, and an `ANTHROPIC_API_KEY` in the environment switches billing to the API. The provider shows which one is active, with the plan. Whether a subscription may be used through a third-party client is a policy question to check before relying on it.

**Generated text**

Commit messages, PR descriptions and branch names come from a model the user picks per task in settings, from any added provider that supports `complete()`; both Claude Code and Copilot CLI do. Each task has its own editable prompt. A one-shot is a session with one prompt, run in a scratch directory owned by the app so it does not show in a worktree's sessions, and deleted afterwards where the agent supports it.

**Normalized events**

Capabilities (whether the agent takes images, sent when the session opens), prompt (the user's message with its attachments, which starts a turn), message chunk, thinking chunk, tool call (start, update, end, kind, file locations, output), plan, permission request and its answer, question and its answer, available commands (slash commands and skills), session title, config options, usage (context used and size, cost when the agent reports it), turn end (stop reason, tokens for the turn), error, resuming (the agent starts again for a stored chat, see `11-platform-services.md`), and interrupted (the turn was under way when yaa closed). A permission request or question waits until it is answered or the turn is cancelled, which answers it as cancelled. Questions are ACP form elicitations: core advertises `elicitation.form` and turns the requested JSON Schema into text, number, yes-or-no and single or multiple choice fields. Core keeps and stores every event of a session, numbered, so a client that connects later, or yaa after a restart, reads the history first. These are also the events plugins subscribe to.

**Chat UI**

The chat is the `chat` plugin's panel (`docs/decisions/0034-chat-plugin.md`).

- A virtualized transcript that renders markdown, code blocks (Shiki, highlighted when on screen and complete), collapsible thinking output, tool calls with status, inline diffs and output, and the latest plan above it. Output opens on demand, at once for a failed call. A call still open when its turn ends shows as stopped. Events that arrive between two frames render together. The transcript stays at its end while it streams, unless scrolled up.
- File paths and links are clickable: a path in the worktree opens the file in the editor at the line, a web URL opens in the browser. A code span counts as a path when it has an extension and a folder or a line.
- A composer with model picker, thinking-effort selector, mode, slash commands and skills list, attachments and a context meter, whose tooltip shows the cost. The pickers open in the palette and show only the options the agent reports. Typing `/` suggests commands. Attachments are files, sent as links the agent reads, and pasted images, for an agent that takes them. Each chat keeps its own draft, also across worktree switches; while a turn runs the draft waits, and send is stop.
- A header that always shows the active agent, model, permission mode, effort and mode, and counts of loaded skills and MCP servers, so hidden state is never a surprise. The counts arrive with MCP and skills per worktree.
- Several chats per worktree. The panel header names the chat on screen, switches between them and starts a new one, which asks for the provider. Chat events drive the worktree state badge (Running, Needs attention, Error).
- Keys, while the chat panel is focused: Enter sends and Shift Enter breaks the line; Escape stops the turn; I writes a message and / a command; Alt H switches chat, Alt M, Alt E and Alt P pick model, effort and mode, Alt F attaches files, and Page Up and Page Down scroll. Suggestions move with the arrows or Ctrl N and P, Enter or Tab takes one and Escape dismisses them. Alt N starts a new chat from anywhere.

**Chat view: our interface or the agent's CLI**

- Each chat has a toggle between our interface, over ACP, and the agent's own terminal UI, which runs in an app terminal in the worktree.
- Switching is a handoff: the active view closes and the same agent session resumes in the other view where the agent supports resuming. Where it does not, the toggle starts a new chat and says so. Claude Code and Copilot CLI both resume an ACP session by its id in their own CLI (`--resume <id>`).
- In CLI view the app gets no normalized events, so worktree state, attention and usage are limited to what the process and the agent's own files reveal. [claude-code-cli-acp runs the real Claude Code CLI in a PTY and reads its transcript to serve ACP](https://docs.rs/crate/claude-code-cli-acp/0.1.1), which is one possible way to keep both views on one session.

**Extension through plugins**

A chat renderer registry lets a plugin render a specific tool-call kind or message part. Event subscriptions let a plugin react to an agent question by opening a dedicated questionnaire panel, or show the skills an agent loaded in its own panel.
