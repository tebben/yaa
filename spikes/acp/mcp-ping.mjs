// Minimal stdio MCP server with one tool, logs calls to $PING_LOG.
import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
const log = (m) => process.env.PING_LOG && appendFileSync(process.env.PING_LOG, m + "\n");
log("started");
const send = (o) => process.stdout.write(JSON.stringify(o) + "\n");
createInterface({ input: process.stdin }).on("line", (l) => {
  const m = JSON.parse(l);
  if (m.id === undefined) return;
  if (m.method === "initialize")
    return send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "ping", version: "0" } } });
  if (m.method === "tools/list")
    return send({ jsonrpc: "2.0", id: m.id, result: { tools: [{ name: "ping", description: "Returns pong", inputSchema: { type: "object", properties: {} } }] } });
  if (m.method === "tools/call") { log("called"); return send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: "pong-7731" }] } }); }
  send({ jsonrpc: "2.0", id: m.id, result: {} });
});
