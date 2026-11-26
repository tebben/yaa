import {
	fromCoreMessage,
	type ToCoreMessage,
} from "@yaa/contracts/process-control";
import {
	type MessagePortMain,
	type UtilityProcess,
	utilityProcess,
} from "electron";

export type CoreProcess = {
	// Hands the core one end of a new channel; it serves the protocol on it.
	connect(port: MessagePortMain): void;
	// Called after the core exited and a new one was forked, so every open
	// page can be given a port to it.
	onRestart(listener: () => void): void;
	stop(): void;
};

// Forks the core and forks it again whenever it exits. Main stays out of the
// data path: it only passes ports along.
export const startCoreProcess = (entry: string): CoreProcess => {
	let child: UtilityProcess;
	let ready = false;
	let stopping = false;
	const waiting: MessagePortMain[] = [];
	const restartListeners = new Set<() => void>();

	const send = (port: MessagePortMain) => {
		const message: ToCoreMessage = { kind: "connect" };
		child.postMessage(message, [port]);
	};

	const fork = () => {
		ready = false;
		child = utilityProcess.fork(entry, [], {
			serviceName: "yaa-core",
			stdio: "inherit",
		});
		child.on("message", (raw) => {
			const message = fromCoreMessage.parse(raw);
			if (message.kind === "ready") {
				ready = true;
				for (const port of waiting.splice(0)) send(port);
			}
		});
		child.on("exit", (code) => {
			if (stopping) return;
			console.error(`core exited with code ${code}, restarting`);
			for (const port of waiting.splice(0)) port.close();
			fork();
			for (const listener of restartListeners) listener();
		});
	};

	fork();

	return {
		connect(port) {
			if (ready) send(port);
			else waiting.push(port);
		},
		onRestart(listener) {
			restartListeners.add(listener);
		},
		stop() {
			stopping = true;
			child.kill();
		},
	};
};
