<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Connectors and issue tracker

A connector is a plugin that implements one of two interfaces, so the rest of the app never talks to GitHub, GitLab or Jira directly.

- **Source control:** create and read pull or merge requests, read CI/CD state, merge. First implementation: GitHub through the `gh` CLI. GitLab follows through `glab` or its API.
- **Issue tracker:** list and read issues, compute stats, build links. First implementation: Jira.

**Authentication**

GitHub and GitLab reuse the CLI's existing login. Jira uses an API token or OAuth, stored in the operating system keychain (assumption; see Open questions).

**Per-project configuration**

Each project selects its connectors and their settings in project settings:

- Jira site, project key or keys, an optional parent (epic) to scope to, and an optional JQL filter that overrides the rest.
- Default ticket prefix and the branch-naming strategy (template or LLM prompt, see Projects and worktrees).
- Merge method and target branch for the source-control connector.

**Issue tracker interface**

| Method | Purpose |
| --- | --- |
| `listIssues(filter)` | issue rows for the overview, paged |
| `getIssue(id)` | title, description, status and link for a worktree or prompt |
| `stats(filter)` | counts by status for the overview |
| `resolveId(input)` | turn `123` into `PROJ-123` using the project prefix |

**Flows**

- From the project overview: filter or search issues, then start a worktree from a row.
- From the palette: enter a ticket id; the connector resolves it, the naming strategy names the branch, and the worktree is created, optionally with the ticket text as the first prompt of a new chat.
- Stats (issues by status, open versus done) appear in the project overview next to the per-worktree cost.
