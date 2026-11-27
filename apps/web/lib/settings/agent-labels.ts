import type { AgentReport, ProviderCapability } from "@yaa/contracts/providers";

const CAPABILITIES: Record<ProviderCapability, string> = {
	resume: "Resume",
	effort: "Thinking effort",
	usage: "Usage",
	discovery: "MCP and skill list",
	"mcp-toggling": "Switch MCP servers off",
	"skill-toggling": "Switch skills off",
};

export const capabilityLabels = (capabilities: readonly ProviderCapability[]) =>
	capabilities.map((capability) => CAPABILITIES[capability]).join(" · ");

export const stateLabels: Record<AgentReport["state"], string> = {
	connected: "Connected",
	"signed-out": "Signed out",
	missing: "Not installed",
	failed: "Not working",
};
