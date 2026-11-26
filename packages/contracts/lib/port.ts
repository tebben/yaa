// The one shape every transport end is adapted to: a DOM MessagePort in the
// page, Electron's MessagePortMain in the core and plugin host, an in-memory
// pair in tests. Keeping it this small lets client and server run anywhere.
export type Port = {
	postMessage(message: unknown): void;
	onMessage(listener: (message: unknown) => void): void;
	onClose(listener: () => void): void;
	close(): void;
};
