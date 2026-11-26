import type { Port } from "@yaa/contracts/protocol";
import type { MessagePortMain } from "electron";

export const fromMessagePortMain = (port: MessagePortMain): Port => {
	port.start();
	return {
		postMessage: (message) => port.postMessage(message),
		onMessage: (listener) =>
			port.on("message", (event) => listener(event.data)),
		onClose: (listener) => port.on("close", listener),
		close: () => port.close(),
	};
};
