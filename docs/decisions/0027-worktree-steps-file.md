# 0027 Setup and teardown steps: a project file read from the main checkout

Status: decided, 2026-11-26.

Context: `docs/spec/02-worktrees.md` puts a project's setup and teardown steps in project settings or in a project file that may be committed. Project settings arrive in M6, and the steps are needed in M2. The file's place and format, and which copy of it counts, had to be chosen.

Decision:
- `.yaa/worktree.json`, plain JSON as in `0020-settings-files-json.md`.
- It is read from the main checkout, for setup and teardown alike. It then works committed or not, and checking out somebody else's branch into a worktree does not run the commands that branch brings.
- The commands run without asking first, with the user's permissions, as plugins do (`0004-plugin-trust.md`).
- Copy patterns are matched by `git ls-files`, so only untracked files are copied and no pattern reaches outside the repository.

Rejected: entries per project path in the app's `settings.json`, which the M6 project layer would replace; reading the file in the new worktree, which misses an uncommitted file and runs a branch's commands on checkout; a prompt to trust a project's file, since adding the project is already the user's choice to work in it.

Consequences: a change to the file on a branch applies once the main checkout has it. A repository whose main checkout holds a hostile file runs it when the first worktree is created.
