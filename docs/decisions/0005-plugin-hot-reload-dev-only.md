# 0005 Plugin hot reload in dev mode only

Status: decided, 2026-11-26.

Decision: the plugin watcher and Svelte compiler run only in dev mode. Production loads prebuilt plugins, and plugin changes take effect after a restart.

Consequences: the production build stays small. The M0 spike proves hot reload works before the plugin API is frozen.
