// The agent process core runs: Anthropic's Claude Agent SDK behind ACP.
// This is the adapter's own program, which the package does not export, so it
// is reached by its path; its `serveAcp` export would leave out what the
// program does around it, such as applying managed policy settings.
import "./node_modules/@agentclientprotocol/claude-agent-acp/dist/index.js";
