import type { Port } from "@yaa/contracts/protocol";

export const fromMessagePort = (port: MessagePort): Port => {
	port.start();
	return {
		postMessage: (message) => port.postMessage(message),
		onMessage: (listener) =>
			port.addEventListener("message", (event) => listener(event.data)),
		onClose: (listener) => port.addEventListener("close", listener),
		close: () => port.close(),
	};
};
