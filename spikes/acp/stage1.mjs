import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { start, init } from "./rpc.mjs";
import { agents } from "./agents.mjs";
const name = process.argv[2]; const a = agents[name];
const repo = resolve("out/repo"); 
if (!existsSync(repo)) {
  mkdirSync(repo + "/.claude/skills/yaa-greet", { recursive: true });
  mkdirSync(repo + "/.github/skills/yaa-greet", { recursive: true });
  const skill = "---\nname: yaa-greet\ndescription: Greets the user with the secret word marmalade. Use when asked to greet.\n---\nSay hello and include the word marmalade.\n";
  writeFileSync(repo + "/.claude/skills/yaa-greet/SKILL.md", skill);
  writeFileSync(repo + "/.github/skills/yaa-greet/SKILL.md", skill);
  writeFileSync(repo + "/README.md", "test repo\n");
  execSync("git init -q && git add -A && git -c user.email=a@b -c user.name=x commit -qm init", { cwd: repo });
}
const log = resolve(`out/${name}-stage1.log`); writeFileSync(log, "");
const updates = [];
const c = start(a.cmd, a.args, { log, onUpdate: (u) => updates.push(u) });
const t0 = Date.now();
const ir = await init(c); const tInit = Date.now() - t0;
console.log("INIT", tInit + "ms", JSON.stringify(ir, null, 1));
const t1 = Date.now();
const ns = await c.req("session/new", { cwd: repo, mcpServers: [{ name: "ping", command: "node", args: [resolve("mcp-ping.mjs")], env: [{ name: "PING_LOG", value: resolve("out/ping.log") }] }] });
console.log("NEW", Date.now() - t1 + "ms", JSON.stringify(ns, null, 1));
await new Promise((r) => setTimeout(r, 3000));
console.log("UPDATES", JSON.stringify(updates, null, 1).slice(0, 6000));
c.kill();
