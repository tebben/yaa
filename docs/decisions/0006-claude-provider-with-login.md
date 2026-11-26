# 0006 Claude Code is a supported provider, signed in by its own CLI

Status: decided, 2026-11-26.

Decision: Claude Code is a first provider next to Copilot CLI. Sign-in runs the agent's own login command in an app terminal; the app stores no agent credentials.

Consequences: the provider shows whether subscription or API billing is active. Whether a subscription may be used through a third-party client is still checked before relying on it (`docs/spec/05-agents-chat.md`).
