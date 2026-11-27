# 0040 Keybinding scope comes from the command and the palette

Status: decided, 2026-11-27.

Context: nearly every binding repeated what the app already knew, in `when`: that the palette was closed, and for a panel's command that its panel was focused. Leaving either out was a silent bug, such as a key that fired over the palette or in another panel.

Decision:
- **The open palette owns the keyboard.** Only its own commands have keys while it is open, and none of them while it is closed. There is no `palette.open` context key.
- **A panel command's keys belong to its panel.** A binding applies while that panel is focused unless it says `global: true`. User bindings follow the same rule. `reveal` cannot say which keys are global: chat's Alt N works anywhere, its Alt M only in the chat.
- A `self` name in `when` for the plugin's own panel was rejected: a plugin can have several panels, and it would still be written on every binding.

Consequences: nothing, `keybindings.json` included, can bind a key that works over the palette. Forgetting `global` gives a key that does too little, not one that takes keys from other panels.
