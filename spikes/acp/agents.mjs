import { resolve } from "node:path";
export const agents = {
  claude: { cmd: "node", args: [resolve("node_modules/@agentclientprotocol/claude-agent-acp/dist/index.js")] },
  copilot: { cmd: "copilot", args: ["--acp"] },
};
