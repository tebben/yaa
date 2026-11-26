# 0031 Vim keys in the editor: monaco-vim, patched

Status: decided, 2026-11-26.

Context: the editor gets vim keys, on by default. monaco-vim 0.4.4, the latest release, is developed against Monaco 0.33.

Decision: monaco-vim 0.4.4 with a pnpm patch (`patches/`):
- Its imports of `monaco-editor/esm/vs/...` do not resolve through Monaco 0.58's exports, so they name the exported paths.
- The `browser` export, a UMD build, is removed, so the build takes the ES module.
- Indenting passes `useTabStops: false` to Monaco's `ShiftCommand`. With tab stops, 0.58 needs a language configuration service the extension does not pass, and a line whose indent is not a multiple of the indent size would fail.

Consequences: an update of Monaco or monaco-vim has to re-check the patch, since the extension uses Monaco internals. Switching vim keys off waits for plugin settings.
