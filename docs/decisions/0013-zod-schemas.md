# 0013 Runtime schemas: Zod 4

Status: decided, 2026-11-26.

Context: `contracts` needs one schema library for protocol messages, plugin manifests and settings, with TypeScript types inferred from the schemas. Validation speed matters more than bundle size: the core validates every protocol message, and the app is a desktop app.

Decision: Zod 4 (`zod`, 4.x at the time of writing), the full package, not `zod/mini`, which trades ergonomics for size.

Consequences: types are inferred with `z.infer`, so each message has one definition. Hot paths such as chat streaming validate at the boundary once per message, not per chunk inside the renderer. Revisit only if profiling shows validation as a bottleneck.
