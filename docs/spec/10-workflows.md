<!-- Part of the yaa spec. Imported from the planning doc; this repo is now the source of truth. -->

## Workflows and automations

Lands in: M5.

A workflow is a named definition that chains steps, started by a trigger, and runs per project or per worktree. It covers both "start a review on this PR" and "pick up my Jira ticket on its own". The engine lives in core, so run state is durable and survives a restart; the workflows plugin supplies the editor, the triggers and the runs panel.

**Triggers**

- **Manual:** from the palette, an issue row, a PR, or a worktree (for example "review this PR").
- **Event:** any plugin event, for example `issue.assigned`, `pr.opened`, `ci.failed` or `worktree.created`.
- **Sensor:** a connector polls on an interval and emits events; for example the Jira connector emits `issue.assigned` when a ticket is assigned to the user. There are no webhooks for a local app, so sensors poll, with backoff. Sensors are off until the user enables them per project.

**Steps**

| Step | What it does |
| --- | --- |
| Create worktree | from a branch, ticket or PR, using the project naming strategy |
| Agent prompt | runs a prompt in a chat with a chosen provider, model, effort, skills and MCP set; the prompt is a template over the run context |
| Shell | runs a command in the worktree and captures output |
| Git | stage, commit (message generated or templated) and push |
| Source control | create or update a PR or MR, post a comment, read CI state |
| Approval | pauses the run until the user approves, rejects or edits |
| Notify | raises a notification or sets needs-attention |
| Service call | calls a function exposed by a plugin |

Each step has a mode, `auto` or `review`. A review step does the work it can and then waits: it shows what it is about to do (the prompt, the commit message, the PR text, the diff) and the user approves, edits or rejects. A waiting run sets its worktree to Needs attention.

**Run context**

Every run carries a context object: the trigger payload (ticket, PR), the worktree, and each step's output. Later steps read it in templates, so a PR step can use the agent's summary and the ticket key.

**Runs panel**

- A list of runs with state (queued, running, waiting for approval, failed, succeeded, cancelled), trigger, worktree, duration and cost from the usage ledger.
- A run detail view with a step timeline, per-step output and logs, the linked chat and worktree, and the results: PR link, diff summary and cost.
- Actions: approve, reject, edit and continue, retry from a step, cancel. A failed step stops the run and says why; nothing retries silently.

**Examples**

- *Review a PR:* manual trigger on a PR, create worktree from the PR branch, agent prompt with a review prompt, approval step, post the review as a PR comment.
- *Pick up a ticket:* sensor sees an assigned Jira ticket, create worktree, agent prompt with the ticket text, shell step runs the project check command, git step commits and pushes, source control step creates the MR, notify. Reviewing the plan or the commit can be marked `review` and the rest `auto`.

**Guardrails for unattended runs (proposed)**

- Sensors and `auto` steps are opt-in per project and per workflow.
- A run that writes code needs an explicit agent permission mode in its definition; there is no hidden default.
- Push and PR steps only touch branches the workflow created, and never force-push.
- A concurrency limit per project, so a burst of assigned tickets does not start twenty agents.
- Text from a ticket, PR, review comment or CI log is untrusted input: anyone who can edit a ticket can write instructions into the agent's prompt. A run started by a sensor or event trigger therefore cannot use the allow-all permission mode, and its agent steps run with the "ask for risky actions" mode or stricter. Templates mark trigger text as quoted data in the prompt, but the permission mode is the real control.
- A run started by a sensor stops at an approval step before its first push, unless the project explicitly opts out for that workflow.

**Definition format**

Workflows are files, one per workflow, in the user folder or in a per-project folder that may be committed with the repository. Features for sharing workflows or rules within a team are out of scope (`docs/decisions/0012-no-team-sharing.md`). A plugin can also contribute workflows and new step types. Declarative YAML or JSON versus TypeScript is an open question; the default proposal is declarative, with a service-call step as the escape hatch.
