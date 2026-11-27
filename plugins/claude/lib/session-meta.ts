import type { SwitchedOff } from "@yaa/plugin-api";

// Has the adapter pass Claude Code settings that leave out what yaa switches
// off, on top of the user's own, which stay as they are
// (docs/decisions/0040-switching-mcp-servers-and-skills.md). Undefined when
// there is nothing to leave out.
export const sessionMeta = ({ mcpServers, skills }: SwitchedOff) => {
	if (mcpServers.length === 0 && skills.length === 0) return undefined;
	return {
		claudeCode: {
			options: {
				settings: {
					deniedMcpServers: mcpServers.map((serverName) => ({ serverName })),
					skillOverrides: Object.fromEntries(
						skills.map((name) => [name, "off"]),
					),
				},
			},
		},
	};
};
