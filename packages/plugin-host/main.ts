// Entry of the plugin host, forked by Electron main as a utilityProcess when
// the core asks for one. Its one message carries the port to the core
// (docs/decisions/0018-core-transport-messageport.md).
import { toPluginHostMessage } from "@yaa/contracts/process-control";
import { fromMessagePortMain } from "@yaa/contracts/protocol";
import { startPluginHost } from "./lib/plugin-host.ts";

const parent = process.parentPort;

parent.once("message", (event) => {
	toPluginHostMessage.parse(event.data);
	const [port] = event.ports;
	if (port === undefined) throw new Error("connect without a port");
	startPluginHost(fromMessagePortMain(port));
});
