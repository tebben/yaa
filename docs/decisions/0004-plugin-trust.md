# 0004 Plugin trust: full user permissions in v1

Status: decided, 2026-11-26.

Decision: plugins run with the user's full permissions, like VS Code extensions. The manifest declares what a plugin uses, for transparency only.

Consequences: no permission prompts in v1. They can be added later on top of the manifest declarations.
