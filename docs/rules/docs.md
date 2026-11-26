# Docs rules

Where things go:
- `docs/spec/`: what the app does and why. Present tense, describes the target.
- `docs/plan.md`: order of work and milestone exit checks.
- `docs/decisions/`: one file per choice or spike result. `open-questions.md` lists what is still open.
- `docs/design/`: how it looks.
- `docs/rules/`: how code is written.
- `docs/glossary.md`: domain terms, one line each. Use these names in code and docs.
- `.claude/skills/`: agent skills, copied from upstream and owned here; sources and local changes in its `README.md`.

Updating a spec:
1. A change that alters behaviour updates the spec file in the same commit. Code and spec never disagree on the main branch.
2. Edit the file that owns the topic (index in `docs/README.md`). Do not repeat a fact in a second file. Link to another file by its path, for example `see 02-worktrees.md`, never by a section name alone.
3. Mark the status of anything not settled: `(proposed)`, `(open, see docs/decisions/open-questions.md)` or `(unverified)`. Unverified claims about third-party packages, APIs or versions name the spike or check that will verify them.
4. Do not change something a decision file records as decided. Propose the change to the user; if they agree, write a new decision file that supersedes the old one, then edit the spec.
5. Do not add features that are not in the spec or plan. Ask first.

Adding a spec file:
- Only for a topic that no existing file owns and that needs more than a few paragraphs. Otherwise extend the closest file.
- Name it `NN-topic.md` with the next free number, start with a `##` heading, and add it to the index in `docs/README.md` in the same commit.
- Every `##` section starts with a `Lands in:` line naming its milestone from `docs/plan.md`, or Later. A new or moved feature updates both the tag and the plan.
- Never renumber existing files; other docs link to them.

Closing an open question:
1. Write `docs/decisions/NNNN-title.md`: status and date, context, decision, consequences. A few lines.
2. Strike the question through in `open-questions.md`, move it under Closed and link the file.
3. Update every spec and plan line that called it open.

Spike results follow the same steps, and the plan item for the spike is done when its decision file exists.

Writing and editing:
- Edit in place. Rewrite the section so it reads as if written fresh. Never append "Update:", "Note:" or change history; history lives in decision files and git.
- Lean is not lossy. Every requirement, number, name, constraint, status marker and open item survives an edit. Removing a requirement needs the user's agreement or a decision file. After shortening text, compare old and new line by line and list anything dropped in your summary.
- A spec holds requirements and the reason when it is not obvious. Long rationale, alternatives and spike findings go in a decision file, linked from the spec.
- One example per point at most. No introductions, recaps or closing summaries in a section.
- A spec section over about one screen is a prompt to split it or cut repetition, not to drop requirements.
- Prose follows the `unslop` skill (`.claude/skills/unslop`): plain, specific sentences, sentence-case headings, no filler.
