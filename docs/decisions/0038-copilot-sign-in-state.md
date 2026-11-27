# 0038 Copilot CLI's sign-in state

Status: decided, 2026-11-27.

Context: M2 step 10 adds the Copilot CLI provider. Its sign-in state was unverified: the M0 spike ran signed in, and Copilot CLI has no `auth/status` over ACP and no command that prints one (`docs/decisions/0014-acp-coverage.md`).

Versions: GitHub Copilot CLI 1.0.116 (`copilot --acp`), ACP v1, Linux.

Checked, signed out by pointing `COPILOT_HOME` at an empty folder with no token in the environment:
- `initialize` answers as when signed in, in 0.5 s, with one terminal auth method: `copilot-login`, "Run `copilot login` in the terminal", whose `_meta` names the CLI's binary and `login`.
- `session/new` fails at once with ACP's `auth_required` error (`-32000`, "Authentication required").
- The CLI's subcommands offer no status: `copilot login` only signs in, and tokens come from the system keyring, a file under `COPILOT_HOME` or `COPILOT_GITHUB_TOKEN`, `GH_TOKEN` and `GITHUB_TOKEN`.
- Signed in, the same check takes 1.9 s for `initialize` and up to 1.5 s more for `session/new`, which also starts the user's own MCP servers.

Decision:
- The Copilot provider reports its sign-in state as unknown, so a chat can start with it. Rejected: opening a session to check, which costs a process and seconds each time the provider list shows; and reading Copilot's config file, whose format is its own and which may hold tokens.
- Core turns an `auth_required` error from `session/new`, `session/resume` or `session/load` into one that says the agent needs a sign-in, followed by the description of each auth method the agent offered in `initialize`. This works for any ACP agent, not only Copilot.

Consequences: a signed-out Copilot shows as ready, and starting a chat fails with "The agent needs you to sign in. Run `copilot login` in the terminal". After signing in, starting again works; there is nothing to check first. From M3 the sign-in could run the terminal auth method in an app terminal (`docs/decisions/0023-setup-output-and-sign-in-before-the-terminal.md`).
