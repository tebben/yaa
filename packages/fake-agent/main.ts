// The fake agent as a process: ACP over stdin and stdout, as a real agent
// runs. Anything it logs goes to stderr. It exits when core closes stdin.
import { Readable, Writable } from "node:stream";
import { ndJsonStream } from "@agentclientprotocol/sdk/unstable";
import { createFakeAgent } from "./lib/fake-agent.ts";

const connection = createFakeAgent().connect(
	ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin)),
);
await connection.closed;
process.exit(0);
