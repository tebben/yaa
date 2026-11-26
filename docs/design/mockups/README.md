# Mockups

Reference only: a guide to mood, density and layout, **not a pixel spec**. Do not copy the markup; build real components from `docs/design/ui.md` and `tokens.json`.

The `.dc.html` files are Claude Design Components from the web design canvas (they need that runtime to render, so they are not viewable by opening them in a browser). `canvas.json` is the board layout.

| Board | File | Shows |
| --- | --- | --- |
| 1 Workspace | Main | default grid: project tree, chat, diff, terminal, rail |
| 2 Project overview | Overview | worktrees and agents needing attention |
| 3 Workflow runs | Workflows | runs panel, step states, HITL approvals |
| 4 Diff review, palette | Review | annotated diff, command palette |
| 5 Component library | Components, Icon, Menu, Rail | buttons, badges, tabs, tree, composer, icon map |
| 6 Branding | Brand, Mark | the "y" mark, wordmark |

Export PNGs from the canvas and drop them next to these files if you want them viewable in the repo (agents can read images).
