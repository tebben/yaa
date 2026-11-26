# Mockups

Reference only: a guide to mood, density and layout, **not a pixel spec**. Do not copy the markup; build real components from `docs/design/ui.md` and `tokens.json`. Where a mockup and `tokens.json` disagree, the tokens win.

Look at the PNGs. The `.dc.html` files are the sources from the Claude Design canvas; they need its runtime (`support.js`, not in the repo) to render. `canvas.json` is the board layout.

| Board | Image | Source | Shows |
| --- | --- | --- | --- |
| 1 Workspace | `Main.png` | `Main.dc.html` | default grid: project tree, changes, editor with annotation, chat with composer, terminal, rail |
| 2 Project overview | `Overview.png` | `Overview.dc.html` | worktrees and agents needing attention |
| 3 Workflow runs | `Workflows.png` | `Workflows.dc.html` | runs panel, step states, HITL approval |
| 4 Diff review, palette | `Review.png` | `Review.dc.html` | annotated diff, review panel, command palette |
| 5 Component library | `Components.png` | `Components.dc.html` | buttons, badges, inputs, panels, tabs, tree, composer, icon map, colour tokens |
| 6 Branding | `Brand.png` | `Brand.dc.html`, `Mark.dc.html` | the "y" mark, wordmark, app icon |
| Parts | `Menu.png`, `Rail.png` | `Menu.dc.html`, `Rail.dc.html`, `Icon.dc.html` | left menu, right rail, icon component |

When a board changes, export its PNG again from the canvas and commit both files together.
