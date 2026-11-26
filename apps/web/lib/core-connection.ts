import { type Client, createClient } from "@yaa/contracts/client";
import { type CoreProtocol, coreProtocol } from "@yaa/contracts/core-protocol";
import {
	type ConnectCoreMessage,
	corePortMessage,
} from "@yaa/contracts/process-control";
import { fromMessagePort } from "./message-port.ts";

export type CoreClient = Client<CoreProtocol>;

// Asks the preload for a port to the core and attaches every port it hands
// over: one per page load, and a new one after each core restart.
export const connectCore = (): CoreClient => {
	const client = createClient(coreProtocol);
	const origin = window.location.origin;
	window.addEventListener("message", (event) => {
		if (event.source !== window || event.origin !== origin) return;
		if (!corePortMessage.safeParse(event.data).success) return;
		const [port] = event.ports;
		if (port === undefined) throw new Error("Core port message without a port");
		client.attach(fromMessagePort(port));
	});
	const request: ConnectCoreMessage = { kind: "yaa:connect-core" };
	window.postMessage(request, origin);
	return client;
};
