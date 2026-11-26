# Open questions and risks

Imported from the spec. Each open question becomes a spike or a decision note in this folder.


**Open questions**

- **Plugin trust:** decided: plugins get full user permissions in v1, declared in the manifest for transparency. Per-plugin permission prompts can be added later.
- **Grid:** build a small custom dockable grid, or adopt a library? Decide in milestone 1 with a short spike.
- **Generated text:** decided: a separately configured model, picked in settings from the added providers (see Generated text). Open: which providers can serve a one-shot call without a chat session.
- **ACP coverage for Copilot CLI:** does it expose models, thinking effort, loaded skills, MCP list and usage? Milestone 0 answers this and decides what the chat header can show.
- **Ghostty:** is libghostty-vt stable and fast enough inside Electron, and how is it bound to Node? Milestone 0 spike, with xterm.js as fallback.
- **Jira authentication:** API token or OAuth, and secret storage on Linux through the system keyring.
- **Package manager and runtime:** proposed: pnpm with Node. The backend ships inside Electron, which runs Node, and native modules such as node-pty and SQLite bindings are rebuilt for Electron's Node. Bun stays possible as a script runner or test runner later, but is not the runtime. Confirm in milestone 0 before AGENTS.md commands are written.
- **Worktree location:** a sibling folder of the repository (assumed) or a central directory.
- **Linux updates:** no auto-update in the first release (decided); revisit with electron-updater later.
- **Other platforms:** when macOS and Windows builds start, and who tests them.

* **Workflow format:** declarative YAML or JSON with a service-call escape hatch, or TypeScript. Decide before the workflows plugin starts.
* **Unattended runs:** which steps may be `auto` without a human, in particular push and MR creation, and how a team shares those rules.
* **Licence:** MIT or Apache-2.0. MIT is shorter; Apache-2.0 adds an explicit patent grant and a NOTICE requirement. Both work with the dependencies above, so this is a preference, and it is easy to decide before the first public release.

**Risks**

- **Agent capability gaps:** each agent exposes different data. The provider interface declares capabilities, and the UI hides what an agent cannot do instead of faking it.
- **Plugin hot reload with Svelte** needs a compiler, but only in dev mode, which keeps the production build small. The spike in milestone 0 proves it before the plugin API is frozen.
- **Scope:** the plugin platform and the built-in plugins grow together. Milestones keep the first slice small: shell, chat and worktrees before integrations.
