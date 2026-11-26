# 0024 Panel spacing

Status: decided, 2026-11-26.

Context: the flat, gapless grid in `docs/decisions/0016-dock-grid-dockview.md` makes adjacent panels less distinct. This decision supersedes its zero-gap styling.

Decision: panels have token-based gaps and rounded corners on a subtly contrasting grid. Dockview uses the gap token for its split layout so resizing and drag targets follow the visible panels.

Consequences: the gap is read when the dock is created. A future setting will need to update the dockview theme as well as the token. No setting is added now.
