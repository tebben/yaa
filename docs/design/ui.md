# UI design language

Authority: this file and `tokens.json` win over the mockups. Mockups are a guide.

## Principles
- **Chill**: clean, quiet, nothing competing for focus. Sleek with a little style, not in your face.
- **Flat panels**: separated by 1px hairlines, no gaps between panels, ~4px radius on controls only. No panel rounding or heavy padding.
- **No AI-slop tells**: no coloured left borders on items or buttons, no gradients, no glow. Selection is a quiet tint.
- **Icons over text** for actions (settings, close, add, more). Text only where an icon would be ambiguous. Icon set: `@lucide/svelte`.
- **Font**: Geist Sans and Geist Mono (OFL).
- **Keyboard first**: everything reachable by keys; the command palette is opened by key, there is no search bar in the header.

## Layout
- Header and footer are bound to the **selected project**; they do not span the left menu. The left menu runs full height. A right rail toggles panels.
- Panel header: icon, title, menu, close (x). Tabs never wrap (`nowrap`, truncate with ellipsis).
- Closing: small x button; Ctrl+W closes the tab, then the panel. No hint text about it.
- **Focus must be obvious**: the focused panel shows a 1px accent line on top and a brighter title. Keys act on the focused panel.

## Project tree
Drawn as a **branch graph**: main is the trunk, each worktree a node on a branch. Ring = agent working, filled = done. Selection = tint `selection`, no side border. State dots use the state colours.

## Composer (chat input)
- Context chips (files, issues), `@` autocomplete, `/` for commands and skills.
- Queued messages with a Steer action. Hints: Enter queues, Ctrl+Enter steers, Esc stops.
- Edited-files bar with a Review action.
- Chips for mode, model and thinking effort; context meter ring; send turns into stop while running.
- Drafts survive switching worktrees.

## State colours
Idle (muted), Running (blue), Needs attention (amber), Error (red), Done (green). State is derived from events, never stored by hand.

## Brand
The mark is a lowercase **y** drawn as a git merge: a filled node and an open ring joining into the stem. Wordmark "yaa" in Geist 600. Pronounced "ja". Name meaning: yet another ADE, but mine.
