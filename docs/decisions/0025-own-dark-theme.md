# 0025 Own dark theme and a focus edge set by tokens

Status: decided, 2026-11-26. The order of the surfaces is superseded by `docs/decisions/0026-lighter-grid.md`.

Context: the dark theme followed Ayu Dark. Its warm beige text clashed with the cool greys around it, and its amber accent was nearly the attention state colour, so a focused panel and one that needs attention looked alike. The window used outlines everywhere instead of a hierarchy of surfaces, and the focused panel's 1px fading line was easy to miss.

Decision: yaa has its own dark theme. Surfaces step from the darkest frame through the menu, rail and panels to overlays, each part with its own token so a theme can tune it alone (`docs/design/ui.md`). Text is cool and neutral; the accent is periwinkle, unlike every state colour. The focus edge is a border whose top and side widths are the `focusTop` and `focusSide` tokens: 1px all round by default, a line on top when `focusSide` is 0.

Consequences: a user setting to switch between a border and a line only has to set the two tokens, so it needs no new styling; it lands with the settings page. The light theme in M6 fills the same tokens.
