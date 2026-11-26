// Raw ndjson JSON-RPC client over an agent's stdio; logs every message.
import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
export function start(cmd, args, { log, env, onUpdate = () => {}, onRequest }) {
  const p = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, ...env } });
  p.stderr.on("data", (d) => appendFileSync(log, "STDERR " + d));
  let id = 0; const pending = new Map();
  const w = (o) => { appendFileSync(log, "> " + JSON.stringify(o) + "\n"); p.stdin.write(JSON.stringify(o) + "\n"); };
  createInterface({ input: p.stdout }).on("line", (l) => {
    appendFileSync(log, "< " + l + "\n");
    let m; try { m = JSON.parse(l); } catch { return; }
    if (m.method && m.id !== undefined) {
      // agent -> client request
      if (m.method === "session/request_permission") {
        const o = m.params.options.find((x) => x.kind === "allow_once") ?? m.params.options[0];
        onUpdate({ permission: m.params });
        return w({ jsonrpc: "2.0", id: m.id, result: { outcome: { outcome: "selected", optionId: o.optionId } } });
      }
      if (onRequest) { const r = onRequest(m); if (r) return w({ jsonrpc: "2.0", id: m.id, result: r }); }
      return w({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "not supported" } });
    }
    if (m.method === "session/update") return onUpdate(m.params.update);
    const r = pending.get(m.id); if (!r) return; pending.delete(m.id);
    m.error ? r.rej(Object.assign(new Error(m.error.message), { rpc: m.error })) : r.res(m.result);
  });
  const req = (method, params, timeoutMs = 180000) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej }); w({ jsonrpc: "2.0", id: i, method, params });
    setTimeout(() => pending.has(i) && (pending.delete(i), rej(new Error("timeout " + method))), timeoutMs);
  });
  const notify = (method, params) => w({ jsonrpc: "2.0", method, params });
  return { p, req, notify, kill: () => p.kill() };
}
export const init = (c, extra = {}) => c.req("initialize", { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false, ...extra }, clientInfo: { name: "yaa-spike", version: "0" } });
