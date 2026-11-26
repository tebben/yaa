import type { Port } from "./port.ts";

// The part of Electron's MessagePortMain the adapter uses, written out so
// contracts needs no Electron types: the core and the plugin host pass
// their real ports.
type MessagePortMainLike = {
	start(): void;
	postMessage(message: unknown): void;
	on(event: "message", listener: (event: { data: unknown }) => void): unknown;
	on(event: "close", listener: () => void): unknown;
	close(): void;
};

export const fromMessagePortMain = (port: MessagePortMainLike): Port => {
	port.start();
	return {
		postMessage: (message) => port.postMessage(message),
		onMessage: (listener) =>
			port.on("message", (event) => listener(event.data)),
		onClose: (listener) => port.on("close", listener),
		close: () => port.close(),
	};
};
