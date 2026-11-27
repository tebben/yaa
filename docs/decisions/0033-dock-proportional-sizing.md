# 0033 Dock sizing: proportional, by a dockview patch

Status: decided, 2026-11-26.

Context: panels jumped in size when one was opened, closed, joined into another group or moved. dockview-core 8.9.1 gives every sibling an equal share (`Sizing.Distribute`) when it removes a group and when it adds one at an edge of the grid, the way the panel bar opens panels. A width set by hand was gone after the next open or close. A drop on another panel's edge already splits that panel in half (dockview's `dropSizing`), which is fine. 8.9.1 is the latest release and has no option for the other two.

Decision: a pnpm patch to dockview-core (`patches/dockview-core@8.9.1.patch`, the ES module and CommonJS builds alike) adds `Sizing.Proportional(size?)` to its split view. Under it, the other views keep their shares of each other: a view added with a size takes that share and the rest shrink in proportion, and a removed view's share goes back to the rest in proportion. Without a size, a new view takes one equal share. Removing a group and adding one at an edge of the grid use it, `addPanel`'s `initialWidth` and `initialHeight` included. The dock adapter remembers per panel kind how wide its panel was when it closed alone in its group, and opens it at that width again.

Consequences: closing a panel and opening it again gives the same widths back. An update of dockview-core has to re-check the patch, since it changes the split view's internals, and drop it if dockview gains the same behaviour. The remembered widths last while the app runs; a last-position record per kind (`docs/decisions/0016-dock-grid-dockview.md`) is still to come.
