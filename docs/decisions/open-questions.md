# Open questions and risks

Each open question becomes a spike or a decision file in this folder. When one is closed, strike it through here and link the decision file.

## Open questions

- **Runtime schema library:** one library in `contracts` for protocol messages, plugin manifests and settings. Decided in the repo foundation; ask before choosing.
- **Core transport:** `utilityProcess` with a `MessagePort` (proposed) or a token-protected local WebSocket. M0 spike, see `docs/spec/00-overview.md`.
- **Grid:** build a small custom dockable grid, or adopt a library. M0 spike.
- **ACP coverage:** do Copilot CLI and Claude Code expose models, thinking effort, loaded skills, the MCP list, usage, resume and a one-shot call over ACP? The M0 spike decides what the chat header shows and which providers can serve generated text.
- **Ghostty:** is libghostty-vt stable and fast enough inside Electron, and how is it bound to Node? M0 spike, with xterm.js and node-pty as fallback.
- **Plugin UI loading:** how plugin UI shares the app's Svelte runtime and how it gets styles the app's Tailwind build does not contain. Part of the M0 hot-reload spike.
- **SQLite binding:** `node:sqlite` in Electron's Node or `better-sqlite3`. Part of the M0 native-modules spike.
- **Jira authentication:** API token or OAuth, with the secret in the system keyring on Linux.
- **Workflow format:** declarative YAML or JSON with a service-call escape hatch (proposed), or TypeScript. Decide before the workflows plugin starts.
- **Unattended runs:** which steps may be `auto` without a human, in particular push and MR creation, and how a team shares those rules. The proposed guardrails are in `docs/spec/10-workflows.md`.
- **Other platforms:** when macOS and Windows builds start, and who tests them.

## Closed

- ~~Licence~~: `0001-licence-mit.md`
- ~~Package manager and runtime~~: `0002-pnpm-and-node.md`
- ~~Linux updates~~: `0003-v1-scope.md`
- ~~Plugin trust~~: `0004-plugin-trust.md`
- ~~Generated text model~~: `0007-generated-text-model.md`
- ~~Worktree location~~: `0010-worktree-location.md`

## Risks

- **Agent capability gaps:** each agent exposes different data. The provider interface declares capabilities, and the UI hides what an agent cannot do instead of faking it.
- **Plugin hot reload with Svelte** needs a compiler, but only in dev mode, which keeps the production build small. The M0 spike proves it before the plugin API is frozen.
- **Prompt injection in unattended runs:** ticket and PR text becomes agent input. The guardrails in `docs/spec/10-workflows.md` limit what such a run may do.
- **Scope:** the plugin platform and the built-in plugins grow together. Milestones keep the first slice small: shell, chat and worktrees before integrations.
