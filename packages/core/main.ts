// Entry of the core process, forked by Electron main as a utilityProcess
// (docs/decisions/0018-core-transport-messageport.md).
import {
	type FromCoreMessage,
	toCoreMessage,
} from "@yaa/contracts/process-control";
import { fromMessagePortMain } from "./lib/message-port.ts";
import { type Core, startCore } from "./lib/start-core.ts";

const parent = process.parentPort;
let core: Core | undefined;

const started = (): Core => {
	if (core === undefined) throw new Error("Message before start");
	return core;
};

parent.on("message", (event) => {
	const message = toCoreMessage.parse(event.data);
	switch (message.kind) {
		case "start": {
			if (core !== undefined) throw new Error("Started twice");
			core = startCore(message);
			const ready: FromCoreMessage = { kind: "ready" };
			parent.postMessage(ready);
			return;
		}
		case "connect": {
			const [port] = event.ports;
			if (port === undefined) throw new Error("connect without a port");
			started().connect(fromMessagePortMain(port));
			return;
		}
		case "log":
			started().log(message.record);
			return;
	}
});
