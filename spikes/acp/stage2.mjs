import { writeFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { start, init } from "./rpc.mjs";
import { agents } from "./agents.mjs";
const [name, model, effort] = process.argv.slice(2); const a = agents[name];
const repo = resolve("out/repo");
const log = resolve(`out/${name}-stage2.log`); writeFileSync(log, "");
const pingLog = resolve(`out/${name}-ping.log`); writeFileSync(pingLog, "");
const mcp = [{ name: "ping", command: "node", args: [resolve("mcp-ping.mjs")], env: [{ name: "PING_LOG", value: pingLog }] }];
let updates = [];
const summary = (us) => { const k = {}; for (const u of us) { const n = u.permission ? "PERMISSION" : u.sessionUpdate; k[n] = (k[n] || 0) + 1; } return k; };
const text = (us, kind = "agent_message_chunk") => us.filter((u) => u.sessionUpdate === kind).map((u) => u.content?.text ?? "").join("");
const out = (...x) => { console.log(...x); };
const launch = () => start(a.cmd, a.args, { log, onUpdate: (u) => updates.push(u) });
async function turn(c, sessionId, prompt) {
  updates = []; const t = Date.now();
  const r = await c.req("session/prompt", { sessionId, prompt: [{ type: "text", text: prompt }] }, 300000);
  await new Promise((x) => setTimeout(x, 500));
  out(`TURN "${prompt.slice(0, 40)}" ${Date.now() - t}ms`, JSON.stringify(r), JSON.stringify(summary(updates)));
  out("  text:", JSON.stringify(text(updates).slice(0, 300)));
  out("  thought:", JSON.stringify(text(updates, "agent_thought_chunk").slice(0, 150)));
  for (const u of updates) if (["usage_update", "session_info_update", "plan", "notice"].includes(u.sessionUpdate) || u.permission) out("  ", JSON.stringify(u).slice(0, 400));
  const tc = updates.filter((u) => u.sessionUpdate === "tool_call"); for (const u of tc) out("   tool_call:", JSON.stringify({ title: u.title, kind: u.kind, status: u.status, meta: u._meta, raw: u.rawInput }).slice(0, 300));
  return r;
}
let c = launch(); await init(c);
const ns = await c.req("session/new", { cwd: repo, mcpServers: mcp });
const sid = ns.sessionId; out("SESSION", sid);
for (const [id, v] of [["model", model], [name === "claude" ? "effort" : "reasoning_effort", effort]]) {
  try { const r = await c.req("session/set_config_option", { sessionId: sid, configId: id, value: v }); out("SET", id, v, "ok", JSON.stringify(r).slice(0, 200)); } catch (e) { out("SET", id, v, "ERR", e.message); }
}
await turn(c, sid, "Call the ping tool from the ping MCP server and tell me exactly what it returned, in one sentence.");
await turn(c, sid, "/yaa-greet");
try { const l = await c.req("session/list", { cwd: repo }); out("LIST", JSON.stringify(l).slice(0, 600)); } catch (e) { out("LIST ERR", e.message); }
c.kill(); await new Promise((x) => setTimeout(x, 1000));
// Restart: try resume, then load
for (const method of ["session/resume", "session/load"]) {
  c = launch(); await init(c); updates = [];
  const t = Date.now();
  try {
    const r = await c.req(method, { sessionId: sid, cwd: repo, mcpServers: mcp });
    await new Promise((x) => setTimeout(x, 1500));
    out(method, "ok", Date.now() - t + "ms", "replayed:", JSON.stringify(summary(updates)), "resp keys:", Object.keys(r ?? {}));
    await turn(c, sid, "What exact text did the ping tool return earlier in this conversation? Answer with just that text.");
  } catch (e) { out(method, "ERR", e.message, JSON.stringify(e.rpc ?? {}).slice(0, 200)); }
  c.kill(); await new Promise((x) => setTimeout(x, 1000));
}
// One-shot: fresh process, new session, one prompt, close
{
  const t0 = Date.now(); c = launch(); await init(c);
  const s = await c.req("session/new", { cwd: repo, mcpServers: [] });
  await c.req("session/set_config_option", { sessionId: s.sessionId, configId: "model", value: model }).catch(() => {});
  const t1 = Date.now();
  await turn(c, s.sessionId, "Write a git branch name (kebab-case, max 5 words) for: add a dark mode toggle to settings. Reply with only the name.");
  out("ONESHOT total", Date.now() - t0 + "ms", "after-session", Date.now() - t1 + "ms");
  try { await c.req("session/close", { sessionId: s.sessionId }); out("CLOSE ok"); } catch (e) { out("CLOSE ERR", e.message); }
  c.kill();
}
process.exit(0);
