import { writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { start, init } from "./rpc.mjs";
import { agents } from "./agents.mjs";
const [name, model, manualMode] = process.argv.slice(2); const a = agents[name];
const repo = resolve("out/repo");
const log = resolve(`out/${name}-stage3.log`); writeFileSync(log, "");
const pingLog = resolve(`out/${name}-ping3.log`); writeFileSync(pingLog, "");
const mcp = [{ name: "ping", command: "node", args: [resolve("mcp-ping.mjs")], env: [{ name: "PING_LOG", value: pingLog }] }];
let updates = []; const events = [];
const onRequest = (m) => {
  events.push({ method: m.method, params: m.params });
  if (m.method === "elicitation/create") {
    const props = m.params.requestedSchema?.properties ?? {}; const content = {};
    for (const [k, v] of Object.entries(props)) {
      const opts = v.enum ?? v.oneOf?.map((o) => o.const) ?? v.items?.enum ?? v.items?.anyOf?.map((o) => o.const);
      content[k] = v.type === "array" ? [opts?.at(-1) ?? "blue"] : opts?.at(-1) ?? "blue";
    }
    return { action: "accept", content };
  }
};
const c = start(a.cmd, a.args, { log, onUpdate: (u) => updates.push(u), onRequest });
const ir = await init(c, { elicitation: { form: {} } });
const ns = await c.req("session/new", { cwd: repo, mcpServers: mcp });
const sid = ns.sessionId;
if (model) await c.req("session/set_config_option", { sessionId: sid, configId: "model", value: model });
await c.req("session/set_config_option", { sessionId: sid, configId: "mode", value: manualMode }).then(() => console.log("mode", manualMode), (e) => console.log("mode ERR", e.message));
async function turn(label, prompt, cancelAfter) {
  updates = []; events.length = 0; const t = Date.now();
  const pr = c.req("session/prompt", { sessionId: sid, prompt: [{ type: "text", text: prompt }] }, 300000);
  let tc;
  if (cancelAfter) setTimeout(() => { tc = Date.now(); c.notify("session/cancel", { sessionId: sid }); }, cancelAfter);
  const r = await pr.catch((e) => ({ error: e.message }));
  console.log(`\n## ${label} ${Date.now() - t}ms`, tc ? `cancel->end ${Date.now() - tc}ms` : "", JSON.stringify({ stopReason: r.stopReason, error: r.error }));
  const perms = updates.filter((u) => u.permission);
  for (const p of perms) console.log("PERMISSION", JSON.stringify(p.permission).slice(0, 900));
  for (const e of events) console.log("REQUEST", e.method, JSON.stringify(e.params).slice(0, 1200));
  for (const u of updates.filter((u) => u.sessionUpdate === "tool_call")) console.log("tool_call", JSON.stringify({ t: u.title, k: u.kind, loc: u.locations, meta: u._meta }).slice(0, 300));
  const kinds = {}; for (const u of updates) { const n = u.permission ? "PERM" : u.sessionUpdate; kinds[n] = (kinds[n] || 0) + 1; } console.log("kinds", JSON.stringify(kinds));
  console.log("text", JSON.stringify(updates.filter((u) => u.sessionUpdate === "agent_message_chunk").map((u) => u.content?.text).join("").slice(-300)));
}
rmSync(repo + "/hello.txt", { force: true });
await turn("permission", "Create a file named hello.txt containing the text hi, using a shell command (echo hi > hello.txt). Then stop.");
console.log("hello.txt exists:", existsSync(repo + "/hello.txt"));
await turn("question", "Before anything else, ask me which colour I prefer, red or blue, using your tool for asking the user a question. Then tell me which one I picked, in one sentence.");
await turn("mcp", "Call the ping tool from the ping MCP server and tell me exactly what it returned.");
await turn("cancel", "Write the numbers from 1 to 3000 in words, one per line, no other text.", 1500);
await turn("after-cancel", "Reply with just the word ready.");
c.kill(); process.exit(0);
