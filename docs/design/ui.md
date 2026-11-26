# UI design language

Authority: this file and `tokens.json` win over the mockups. Mockups are a guide.

## Principles
- **Chill**: clean, quiet, nothing competing for focus. Sleek with a little style, not in your face.
- **Layers, not outlines**: parts of the window differ by surface colour (see Surfaces). Hairlines only where two areas of the same surface meet, such as under a panel header.
- **Panels**: separated by narrow gaps on the lighter grid, the workspace they sit in. Panels have rounded corners and no heavy padding.
- **No AI-slop tells**: no coloured left borders on items or buttons, no decorative gradients or glow. Selection is a quiet tint.
- **Icons over text** for actions (settings, close, add, more). Text only where an icon would be ambiguous. Icon set: `@lucide/svelte`.
- **Font**: Geist Sans and Geist Mono (OFL). Panel titles are medium (500), the wordmark semibold (600). No light or thin weights: at 13 to 16px on a dark surface they lose contrast.
- **Dark theme**: yaa's own (`docs/decisions/0025-own-dark-theme.md`): cool neutral surfaces and text, and a periwinkle accent that is none of the state colours.
- **Keyboard first**: everything reachable by keys; the command palette is opened by key, there is no search bar in the header.
- **Cursor**: anything that acts on a click shows the pointer; sashes show the resize cursor.

## Surfaces
Each part of the window has its own colour token, so a theme can tune it alone. The frame (header, footer and menu) is darkest. The grid, the workspace between the menu and the rail, is lighter, so it reads as the content area; the panels and the rail are darker cards on it, each panel with a lighter header strip (`docs/decisions/0026-lighter-grid.md`). Overlays and controls are lightest.

| Part | Token |
| --- | --- |
| Header and footer | `chrome` |
| Left menu | `menu` |
| Panel content and the right rail, the cards on the grid | `surface`, `rail` |
| Panel header, a strip above the content, and on hover | `panelHeader`, `panelHeaderHover` |
| The workspace behind the panels and rail | `grid` |
| Inputs, buttons and key caps | `raised` |
| Palette and tooltips | `overlay`, with the `overlay` shadow and radius |
| Hover, pressed toggle and selected item | `hover`, `pressed`, `selection` |

Lines: `border` for hairlines, `borderStrong` for inputs, key caps, overlays and the scrollbar. Text: `text` (primary), `textSoft` (secondary), `textMuted`. Accent: `accent` and `accentSoft`; `focus` for the focus edge.

## Spacing
- One inset, 12px (`space.3`), from the edge of every area to its content: header, menu items, panel header icon and panel content line up on it.
- 8px between an icon and its text (6px in the header, where the icon is a button with its own padding).
- Heights are on a 4px grid: header 40px, panel header 36px, footer 28px, buttons 26px, rail buttons 32px.

## Layout
- The header spans the window. It leads with the button that hides and shows the left menu and the name "yaa"; these keep their place whether the menu is open or not. While the menu is open they take its width, so the project starts in line with the leftmost panel's content. The header is bound to the **selected project**.
- The left menu, the grid and the right rail sit between the header and the footer, which also spans the window.
- The right rail is a card on the grid, rounded like the panels and as tall as its buttons. Open panels have a bright icon on a quiet `pressed` tint, closed panels a muted icon with no background; hover and keyboard focus add the hover tint. The icon stroke stays the same in both states.
- Panel header: icon, medium title, menu, close (x), on its own surface, a step lighter than the content, with a hairline under it and lighter again while hovered. The menu and close show while the header is hovered. Tabs never wrap (`nowrap`, truncate with ellipsis).
- Closing: small x button; Ctrl+W closes the tab, then the panel. No hint text about it.
- **Focus must be obvious**: the focused panel has a brighter title. After a key moves focus, it also shows the focus edge, a border in the `focus` colour; a click or Escape hides the edge until a key moves focus again. Keys act on the focused panel. The edge's widths are the `focusTop` and `focusSide` tokens: 1px all round by default, or a line on top only with `focusSide` at 0. A setting to choose between the two lands with the settings page (proposed).
- Shortcuts are shown as key caps, one per key (`Kbd` in `packages/ui`), in tooltips and the palette.
- Scrollbars are thin everywhere, in the `borderStrong` colour on a transparent track.

## Command palette
An overlay with rounded corners and a shadow. The query and the rows share one text edge; the selected row is a rounded `selection` tint. Each row shows the command's first key as key caps and its category.

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
