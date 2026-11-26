# yaa docs

Read this first. Authority order when sources disagree:
1. `docs/rules/*.md` (code conventions)
2. `docs/spec/*.md` (what we build and why)
3. `docs/design/ui.md` + `tokens.json` (how it looks)
4. `docs/design/mockups/` (a guide only, not a pixel spec)

`docs/plan.md` says what to do in what order. `docs/decisions/` records choices and spike results. If you change behaviour, update the spec file in the same change. How to change or add specs and decisions: `docs/rules/docs.md`. Domain terms: `docs/glossary.md`.

## Spec index
| File | Topic |
| --- | --- |
| spec/00-overview | goals, architecture |
| spec/01-ui-layout-theming | grid, panels, keyboard model, themes (look: design/ui.md) |
| spec/02-worktrees | projects and worktrees |
| spec/03-plugins | plugin system |
| spec/04-connectors | GitHub, Jira |
| spec/05-agents-chat | ACP providers, chat |
| spec/06-git-review-pr | git panel, diffs, annotations, PRs |
| spec/07-editor-files-terminal | editor, files, terminal |
| spec/08-usage-cost | usage and cost |
| spec/09-mcp-skills | MCP and skills per worktree |
| spec/10-workflows | workflows and automations |
| spec/11-platform-services | sessions, permissions, notifications, search, settings, logs |
| spec/12-stack-packaging | stack, performance, Linux packaging |
| spec/13-repo-conventions | repo layout, Svelte structure, AGENTS.md, testing |

Milestones are in `docs/plan.md`.
