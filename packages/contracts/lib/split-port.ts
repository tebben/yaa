import type { Port } from "./port.ts";
import { clientMessage } from "./wire.ts";

// One port carrying both directions: `serving` gets what the other end asks
// of a server here, `calling` the replies and events for a client here.
export const splitPort = (port: Port): { serving: Port; calling: Port } => {
	const serving = new Set<(message: unknown) => void>();
	const calling = new Set<(message: unknown) => void>();
	port.onMessage((message) => {
		const listeners = clientMessage.safeParse(message).success
			? serving
			: calling;
		for (const listener of listeners) listener(message);
	});
	const half = (listeners: Set<(message: unknown) => void>): Port => ({
		postMessage: (message) => port.postMessage(message),
		onMessage: (listener) => {
			listeners.add(listener);
		},
		onClose: (listener) => port.onClose(listener),
		close: () => port.close(),
	});
	return { serving: half(serving), calling: half(calling) };
};
