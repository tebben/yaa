# UI design language

Authority: this file and `tokens.json` win over the mockups. Mockups are a guide.

## Principles
- **Chill**: clean, quiet, nothing competing for focus. Sleek with a little style, not in your face.
- **Panels**: separated by narrow gaps on a subtly lighter grid. Panels have rounded corners and no heavy padding.
- **No AI-slop tells**: no coloured left borders on items or buttons, no decorative gradients or glow. Selection is a quiet tint.
- **Icons over text** for actions (settings, close, add, more). Text only where an icon would be ambiguous. Icon set: `@lucide/svelte`.
- **Font**: Geist Sans and Geist Mono (OFL).
- **Dark theme**: based on [Ayu Dark](https://github.com/ayu-theme/ayu-colors/blob/master/themes/dark.yaml), with a distinct menu surface and readable shell text.
- **Keyboard first**: everything reachable by keys; the command palette is opened by key, there is no search bar in the header.
- **Cursor**: anything that acts on a click shows the pointer; sashes show the resize cursor.

## Layout
- The header is bound to the **selected project**. The footer spans the full window below the left menu, panels and right rail. The left menu uses a distinct surface colour and a visible divider aligned with the project header. A right rail toggles panels.
- The right rail gives open panels a tinted background and a bright icon. Closed panels have muted icons. The icon stroke stays the same in both states.
- Panel header: icon, semibold title, menu, close (x), with a hairline under it. The menu and close show while the header is hovered. Tabs never wrap (`nowrap`, truncate with ellipsis).
- Closing: small x button; Ctrl+W closes the tab, then the panel. No hint text about it.
- **Focus must be obvious**: the focused panel shows a 1px accent line on top that fades at both ends, and a brighter title. Keys act on the focused panel.

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
The mark is a lowercase **y** drawn as a git merge: a small filled node (main) and a larger open ring (a worktree), each on a branch line, joining at a point from which the stem bends down to the left. The ring's line starts on the ring instead of under it, so the ring stays open. Source: `docs/design/brand/mark.svg`. Wordmark "yaa" in Geist 600. Pronounced "ja". Name meaning: yet another ADE, but this one is mine.
