import { type Client, createClient } from "@yaa/contracts/client";
import { type CoreProtocol, coreProtocol } from "@yaa/contracts/core-protocol";
import {
	type ConnectCoreMessage,
	corePortMessage,
} from "@yaa/contracts/process-control";
import type { Disposable } from "@yaa/contracts/protocol";
import { fromMessagePort } from "./message-port.ts";

export type CoreClient = Client<CoreProtocol>;

export type CoreConnection = {
	client: CoreClient;
	// Calls `listener` after the client got a port to a restarted core, which
	// has forgotten what the old one held for this page.
	onRestart(listener: () => void): Disposable;
};

// Asks the preload for a port to the core and attaches every port it hands
// over: one per page load, and a new one after each core restart.
export const connectCore = (): CoreConnection => {
	const client = createClient(coreProtocol);
	const restarted = new Set<() => void>();
	let connected = false;
	const origin = window.location.origin;
	window.addEventListener("message", (event) => {
		if (event.source !== window || event.origin !== origin) return;
		if (!corePortMessage.safeParse(event.data).success) return;
		const [port] = event.ports;
		if (port === undefined) throw new Error("Core port message without a port");
		client.attach(fromMessagePort(port));
		if (connected) for (const listener of restarted) listener();
		connected = true;
	});
	const request: ConnectCoreMessage = { kind: "yaa:connect-core" };
	window.postMessage(request, origin);
	return {
		client,
		onRestart(listener) {
			restarted.add(listener);
			return { dispose: () => restarted.delete(listener) };
		},
	};
};
