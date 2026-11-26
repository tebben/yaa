# 0011 Plugin API: public, unstable until M6

Status: decided, 2026-11-26.

Context: the API is shaped by the built-in plugins as they are written, so early versions will be wrong in places. Agents writing plugins tend to work around missing API instead of asking for it.

Decision: the plugin API is public from M1 and unstable (`0.x`) until it is frozen as `1.0` in M6. When a plugin needs something, the API changes. Workarounds and compatibility shims are not allowed before the freeze.

Consequences: API changes update core and every affected built-in plugin in one change. Third-party plugins written before M6 may break on any release. Rules in `docs/spec/03-plugins.md`.
