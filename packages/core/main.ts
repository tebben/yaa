// Entry of the core process, forked by Electron main as a utilityProcess
// (docs/decisions/0018-core-transport-messageport.md).
import {
	type FromCoreMessage,
	toCoreMessage,
} from "@yaa/contracts/process-control";
import { createCoreServer } from "./lib/core-server.ts";
import { fromMessagePortMain } from "./lib/message-port.ts";

const server = createCoreServer();
const parent = process.parentPort;

parent.on("message", (event) => {
	const message = toCoreMessage.parse(event.data);
	if (message.kind === "connect") {
		const [port] = event.ports;
		if (port === undefined) throw new Error("connect without a port");
		server.connect(fromMessagePortMain(port));
	}
});

const ready: FromCoreMessage = { kind: "ready" };
parent.postMessage(ready);
