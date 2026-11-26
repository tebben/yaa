import { resolve } from "node:path";
import { start, init } from "./rpc.mjs";
import { agents } from "./agents.mjs";
for (const name of ["claude", "copilot"]) {
  const c = start(agents[name].cmd, agents[name].args, { log: resolve(`out/${name}-stage6.log`) });
  await init(c);
  const l = await c.req("session/list", { cwd: resolve("out/repo") });
  console.log(name, "sessions in repo:", l.sessions.length, l.sessions.map((s) => s.title?.slice(0, 40)));
  if (name === "claude") { const id = l.sessions.find((s) => s.title?.startsWith("Write a git"))?.sessionId ?? l.sessions.at(-1).sessionId; try { await c.req("session/delete", { sessionId: id }); console.log("delete ok"); } catch (e) { console.log("delete ERR", e.message); } }
  c.kill();
}
process.exit(0);
