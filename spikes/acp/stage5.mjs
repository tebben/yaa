import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { start, init } from "./rpc.mjs";
import { agents } from "./agents.mjs";
const log = resolve("out/claude-stage5.log"); writeFileSync(log, "");
const c = start(agents.claude.cmd, agents.claude.args, { log, env: { ANTHROPIC_API_KEY: "sk-ant-fake-spike" } });
await init(c);
console.log(JSON.stringify(await c.req("auth/status", {}, 20000)));
c.kill(); process.exit(0);
