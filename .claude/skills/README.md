# Skills

Copied into the repo and owned here, so upstream changes never alter agent behaviour unseen. To update one, diff it against upstream at a newer commit and keep the local changes listed below.

| Skill | Source | Commit | Local changes |
| --- | --- | --- | --- |
| `svelte-code-writer`, `svelte-core-bestpractices` | `sveltejs/ai-tools`, `tools/skills/` (MIT) | `f9d22f2` | none |
| `setup-ts-deep-modules` | `mattpocock/skills`, `skills/in-progress/` (MIT) | `6f7f783` | none; run once in the repo foundation |
| `improve-codebase-architecture`, `codebase-design` | `mattpocock/skills`, `skills/engineering/` (MIT) | `6f7f783` | glossary and ADR paths point to `docs/glossary.md` and `docs/decisions/` |
| `diagnosing-bugs` | `mattpocock/skills`, `skills/engineering/` (MIT) | `6f7f783` | same paths; regression tests follow `docs/rules/testing.md` |
| `grill-me`, `grilling` | `mattpocock/skills`, `skills/productivity/` (MIT) | `6f7f783` | none |
| `unslop` | probably adapted from pstack's `unslop` (`cursor/plugins`, `pstack/skills/`, MIT); differs from upstream | | not recorded |

The `agents/openai.yaml` files from upstream are left out; they configure Codex, which this repo does not use.

The Svelte MCP server is configured in `.mcp.json` (Claude Code) and `.vscode/mcp.json` (VS Code), using the remote server `https://mcp.svelte.dev/mcp`.
