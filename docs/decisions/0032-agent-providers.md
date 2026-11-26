# 0032 Agent providers and the Claude Code adapter

Status: decided, 2026-11-26.

Context: M2 step 5 adds the provider contribution point (`docs/spec/05-agents-chat.md`). Open were how a provider says what to start, how the Claude Code adapter reaches the user's machine, where the sign-in state comes from, and how the fake agent fits the same interface.

Versions: `@agentclientprotocol/claude-agent-acp` 0.112.0, `@anthropic-ai/claude-agent-sdk` 0.3.331, Claude Code 2.1.332, Electron 45.5.0.

Decision:
- **Interface.** A manifest declares a provider's id, title and capabilities, so the app can list providers without activating a plugin. The backend registers `detect`, `authStatus` and `spawn`. `spawn` names either a command on the machine or the plugin's agent module, which core runs with Electron's binary in Node mode.
- **Adapter.** The `claude` plugin bundles the adapter into its agent module and points it at the user's own CLI with `CLAUDE_CODE_EXECUTABLE`. The SDK's platform binaries are not installed (`ignoredOptionalDependencies`). Rejected: requiring a global `claude-agent-acp`, a second install whose version yaa cannot choose.
- **Sign-in state.** The provider reads `claude auth status --json`, which needs no running agent. Signed out, it prints `"loggedIn": false` and exits with 1 (checked with an empty `CLAUDE_CONFIG_DIR`). With `ANTHROPIC_API_KEY` set it names the key in `apiKeySource`.
- **Programs.** The plugin API gains `programs.find` and `programs.run`, so detection does not reach for Node behind the API's back.
- **Fake agent.** A built-in plugin marked `devOnly` provides it; core loads such plugins in dev mode only. Rejected: keeping a second path in core for it.

Consequences: the built plugin is about 14 MB, most of it the SDK. The SDK is under Anthropic's own terms, not an open-source licence, so whether yaa may redistribute it is checked before packaging (M6). yaa finds `claude` on the `PATH` it was started with, which for a desktop launcher may lack `~/.local/bin`; the doctor (M6) has to report that.
