# 0023 Setup output and agent sign-in before the terminal

Status: decided, 2026-11-26.

Context: two M2 features run commands whose output the spec sends to an app terminal: a worktree's setup and teardown steps (`docs/spec/02-worktrees.md`) and an agent's login command (`docs/spec/05-agents-chat.md`, `docs/decisions/0006-claude-provider-with-login.md`). The terminal lands in M3 (`docs/spec/07-editor-files-terminal.md`).

Decision: M2 does not pull the terminal forward.
- **Setup and teardown output.** Core runs each step without a PTY and logs its output line by line, tagged with the worktree and the step, so the debug panel shows it filtered to that worktree. A failed step sets the worktree to Error with the step's last lines kept for its detail. From M3 the steps run in a terminal in the worktree, as the spec says.
- **Sign-in.** When a provider reports signed out, the chat shows the login command to run in the user's own terminal (`claude auth login`) and a button that checks again. From M3 the sign-in action runs the command in an app terminal; the app still stores no agent credentials.

Rejected: a minimal terminal in M2. It would bring core's PTYs, node-pty and the xterm.js panel forward with their headless mirror, which is M3's work, and a reduced first version would be replaced there.

Consequences: in M2 a setup command gets no input (its stdin is closed), so setup steps must run unattended until M3. Signing in takes one step outside the app until M3.
