<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Usage and cost tracking

Every chat turn is recorded so the user can see what a branch or worktree has burned.

- **Sources:** the provider's usage events: tokens (input, output, cached, reasoning) when the agent reports them, and cost when it reports that. Where only tokens are known, cost is computed from a price table per provider and model. The app bundles a snapshot of a public pricing JSON, for example LiteLLM's model\_prices\_and\_context\_window.json or models.dev, refreshes it on request, and lets the user override any entry. A standard OpenTelemetry format for per-model token prices was not found, so it is not assumed; the generative-AI OpenTelemetry conventions may still be useful for exporting usage later. Where an agent reports neither, for example with per-request billing, the app records request counts and labels the figure as such.
- **Ledger:** an append-only table in the app's SQLite database with timestamp, project, worktree id, branch, session, provider, model, token counts, cost and source (reported or computed). Rows are grouped by project and branch for history, so totals survive deleting a worktree. The worktree id keeps a reused branch name from merging two unrelated worktrees.
- **Where it shows:** a footer chip for the current worktree (this session and total), a breakdown by model in its tooltip, and in the project overview a cost column per worktree, a project total and a time-range filter.
