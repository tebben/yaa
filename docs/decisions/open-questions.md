# Open questions and risks

Each open question becomes a spike or a decision file in this folder. When one is closed, strike it through here and link the decision file.

## Open questions

- **Core transport:** `utilityProcess` with a `MessagePort` (proposed) or a token-protected local WebSocket. M0 spike, see `docs/spec/00-overview.md`.
- **Ghostty:** is libghostty-vt stable and fast enough inside Electron, and how is it bound to Node? M0 spike, with xterm.js and node-pty as fallback.
- **Plugin builds across Svelte versions:** prebuilt plugin UI calls Svelte's internal API, so it only runs on the Svelte version it was built with (`0015-plugin-ui-loading.md`). How third-party plugins follow app upgrades (rebuild on install, ship the compiler, or pin Svelte per API version) is decided before the M6 freeze.
- **SQLite binding:** `node:sqlite` in Electron's Node or `better-sqlite3`. Part of the M0 native-modules spike.
- **Jira authentication:** API token or OAuth, with the secret in the system keyring on Linux.
- **Workflow format:** declarative YAML or JSON with a service-call escape hatch (proposed), or TypeScript. Decide before the workflows plugin starts.
- **Unattended runs:** which steps may be `auto` without a human, in particular push and MR creation. The proposed guardrails are in `docs/spec/10-workflows.md`.
- **Other platforms:** when macOS and Windows builds start, and who tests them.

## Closed

- ~~Licence~~: `0001-licence-mit.md`
- ~~Package manager and runtime~~: `0002-pnpm-and-node.md`
- ~~Linux updates~~: `0003-v1-scope.md`
- ~~Plugin trust~~: `0004-plugin-trust.md`
- ~~Generated text model~~: `0007-generated-text-model.md`
- ~~Worktree location~~: `0010-worktree-location.md`
- ~~Plugin API stability~~: `0011-plugin-api-unstable-until-m6.md`
- ~~Team sharing~~: `0012-no-team-sharing.md`
- ~~Runtime schema library~~: `0013-zod-schemas.md`
- ~~ACP coverage~~: `0014-acp-coverage.md`
- ~~Plugin UI loading~~: `0015-plugin-ui-loading.md`
- ~~Grid~~: `0016-dock-grid-dockview.md`

## Risks

- **Agent capability gaps:** each agent exposes different data. The provider interface declares capabilities, and the UI hides what an agent cannot do instead of faking it.
- **Plugin hot reload with Svelte** needs a compiler, but only in dev mode, which keeps the production build small. The M0 spike showed it works (`0015-plugin-ui-loading.md`).
- **Prompt injection in unattended runs:** ticket and PR text becomes agent input. The guardrails in `docs/spec/10-workflows.md` limit what such a run may do.
- **Scope:** the plugin platform and the built-in plugins grow together. Milestones keep the first slice small: shell, chat and worktrees before integrations.
