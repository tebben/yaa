# 0043 Agents in settings

Status: decided, 2026-11-27.

Context: nothing outside a chat showed which agents yaa supports, whether they work, or which models they offer. A separate "model provider" list, with API keys, was considered for generated text and workflow steps.

Decision:
- An agent provider is the only connection to a model. yaa keeps no second list of model providers, stores no keys and calls no model API itself.
- The settings screen gets an Agents page. It is core's, with its own view in place of setting rows (`0038-settings-screen.md`).
- Connected means a session opens: core opens one without a prompt and takes the models from it, as `0014-acp-coverage.md` found neither agent persists such a session. This also tells Copilot's sign-in state, which `0039-copilot-sign-in-state.md` leaves unknown until a session opens.
- Nothing is cached or checked at app start. Rejected: a stored model list, which goes stale when the agent or the plan changes.

Consequences: opening the page starts every installed agent, which takes a few seconds for Copilot. A model setting for generated text and workflow steps picks from what this check returns.
