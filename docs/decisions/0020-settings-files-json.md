# 0020 Settings files: plain JSON, checked per setting

Status: decided, 2026-11-26.

Context: settings and keybindings are human-editable files with a schema (`docs/spec/11-platform-services.md`). The format and what happens to a file with mistakes in it had to be chosen before core reads them.

Decision:
- Plain JSON, parsed with `JSON.parse`. JSONC (VS Code's format, with comments) was rejected: it needs a parser dependency, and the schema-rendered settings page would have to write the file back without losing the comments, which needs an edit-preserving writer. YAML and TOML were rejected for the same write-back reason and because the schemas and the protocol are JSON already.
- Each setting and each keybinding is checked on its own. A rejected one falls back to its default or is dropped, and is reported as a problem with its path; the rest of the file applies. A file that does not parse applies nothing.
- What a file resolves to depends only on its content. Core does not keep the last good version while a file is broken, so the result after a restart is the same as after the save.

Consequences: no comments in settings files. A save with a syntax error resets that file's settings to the defaults until it is fixed, and the problem is logged and sent to clients. Revisit JSONC if the settings page gets an edit-preserving writer.
