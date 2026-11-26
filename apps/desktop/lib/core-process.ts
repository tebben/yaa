import type { LogRecord } from "@yaa/contracts/log";
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
	// Hands the core its end of the channel to a new plugin host.
	connectPluginHost(port: MessagePortMain): void;
	// A line main logs; it reaches the core once it is ready.
	log(record: LogRecord): void;
	// Called after the core exited and a new one was forked, so every open
	// page can be given a port to it.
	onRestart(listener: () => void): void;
	stop(): void;
};

type StartOptions = {
	entry: string;
	start: Extract<ToCoreMessage, { kind: "start" }>;
	// The core exited before it was ready. Forking it again would fail the
	// same way, so this ends the restarts.
	onStartupFailure(code: number): void;
	// The core asked for a plugin host.
	onStartPluginHost(): void;
	// The core asked for the system's folder picker: the folder chosen, or
	// null when cancelled.
	onPickFolder(): Promise<string | null>;
};

// Forks the core and forks it again whenever it exits. Main stays out of the
// data path: it only passes ports along.
export const startCoreProcess = ({
	entry,
	start,
	onStartupFailure,
	onStartPluginHost,
	onPickFolder,
}: StartOptions): CoreProcess => {
	let child: UtilityProcess;
	let ready = false;
	let stopping = false;
	// Messages wait for the core to be ready; `start` goes first, on spawn.
	let waiting: { message: ToCoreMessage; port?: MessagePortMain }[] = [];
	const restartListeners = new Set<() => void>();

	const send = (message: ToCoreMessage, port?: MessagePortMain) => {
		if (!ready)
			waiting.push(port === undefined ? { message } : { message, port });
		else child.postMessage(message, port === undefined ? [] : [port]);
	};

	const fork = () => {
		child = utilityProcess.fork(entry, [], {
			serviceName: "yaa-core",
			stdio: "inherit",
		});
		child.once("spawn", () => child.postMessage(start));
		child.on("message", (raw) => {
			const message = fromCoreMessage.parse(raw);
			switch (message.kind) {
				case "ready":
					ready = true;
					for (const { message, port } of waiting.splice(0)) {
						send(message, port);
					}
					return;
				case "start-plugin-host":
					onStartPluginHost();
					return;
				case "pick-folder":
					void onPickFolder().then((path) =>
						send({ kind: "picked-folder", id: message.id, path }),
					);
					return;
			}
		});
		child.on("exit", (code) => {
			if (stopping) return;
			if (!ready) {
				stopping = true;
				onStartupFailure(code);
				return;
			}
			ready = false;
			// Ports meant for the dead core are useless; pages get new ones.
			for (const { port } of waiting) port?.close();
			waiting = waiting.filter(({ port }) => port === undefined);
			// Logged through the next core, which flushes it once ready.
			send({
				kind: "log",
				record: {
					at: Date.now(),
					level: "error",
					source: "main",
					message: "core exited, restarting",
					data: { code },
				},
			});
			fork();
			for (const listener of restartListeners) listener();
		});
	};

	fork();

	return {
		connect(port) {
			send({ kind: "connect" }, port);
		},
		connectPluginHost(port) {
			send({ kind: "plugin-host" }, port);
		},
		log(record) {
			send({ kind: "log", record });
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
