# 0008 Lean testing

Status: decided, 2026-11-26.

Decision: tests cover pure logic, protocol contracts and the workflow engine only. No component, wiring or snapshot tests. A fake ACP agent replaces real agents in tests. The default check runs only changed packages.

Consequences: details in `docs/spec/13-repo-conventions.md` and `docs/rules/testing.md`.
