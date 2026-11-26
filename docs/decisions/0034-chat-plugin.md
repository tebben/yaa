# 0034 The chat panel: a plugin, its libraries and the agent API

Status: decided, 2026-11-26.

Context: M2 step 6 replaces the placeholder chat panel. `docs/spec/03-plugins.md` makes chat a plugin, which needs agent sessions in the plugin API, and the transcript needs markdown, highlighting, diffs and virtualization (`docs/spec/05-agents-chat.md`).

Versions: virtua 0.56.0, Shiki 4.6.0, marked 18.3.0, jsdiff 9.0.0, Svelte 5.59.1.

Decision:
- **Plugin.** The chat is the `chat` plugin, a UI module only. A panel reaches its worktree's sessions through `agents` and picks files through `pickFiles`; the plugin host gains nothing, as no backend needs sessions yet. Core's events carry the worktree and provider, so a panel follows sessions started elsewhere.
- **Virtualization.** virtua, which measures items of unknown height and has a Svelte 5 build. Rejected: `@tanstack/svelte-virtual`, built on Svelte stores.
- **Markdown.** marked only parses; Svelte renders its tokens, so an agent's text never becomes HTML and nothing needs sanitising. Rejected: rendering to HTML and sanitising it.
- **Highlighting.** Shiki with its JavaScript regex engine, since the CSP does not allow compiling WebAssembly, a CSS-variables theme mapped to the syntax tokens, and a fixed set of 27 grammars.
- **Diffs.** jsdiff computes the lines of an inline diff.
- **Keys.** Composer keys are panel commands registered only while they can act, such as send while the prompt has focus, so the API needs no context keys of its own. Pickers for mode, model, effort and chats use the app's palette.
- **Attachments.** A file is sent as a link the agent reads itself; a pasted image is sent with the prompt when the agent takes images, and its data is not kept in the session's events.

Consequences: the chat's UI module is about 2.6 MB, loaded when a chat panel first renders. A language outside the set stays plain, as does a block over 50,000 characters. Drafts live in the panel, so closing it or restarting drops them.
