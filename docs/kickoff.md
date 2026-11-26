# Kickoff prompt for the first Claude Code session

Paste this into Claude Code (plan mode, Opus recommended for this first session):

---
This repo is the start of yaa, a worktree-first, keyboard-first agentic IDE. All planning from an earlier web chat is in this repo; you have no other context.

1. Read AGENTS.md, docs/README.md, docs/plan.md, docs/design/ui.md, then skim docs/spec/ (00, 05, 13 fully; others as needed).
2. Do only "Before M0: repo foundation" from docs/plan.md: monorepo with pnpm + Node + strict TypeScript + Biome + Vitest, the structure rules and lint scripts from docs/spec/13-repo-conventions.md, docs/rules/*.md, and fill the commands in AGENTS.md.
3. Make small commits. Ask me before choosing anything the docs mark as open (docs/decisions/open-questions.md).
4. Stop after the foundation and report; do not start M0 spikes or feature code.
---

Then run the M0 spikes one at a time in separate sessions, each ending with a note in docs/decisions/.
