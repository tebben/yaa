import type { LogRecord } from "@yaa/contracts/log";
import type { ToPluginHostMessage } from "@yaa/contracts/process-control";
import {
	MessageChannelMain,
	type MessagePortMain,
	type UtilityProcess,
	utilityProcess,
} from "electron";

type PluginHostOptions = {
	entry: string;
	// The core's end of the channel to a newly forked host.
	onPort(port: MessagePortMain): void;
	log(record: LogRecord): void;
};

// Forks the plugin host when the core asks for one. The core's supervisor
// decides when; main only forks and hands the core its port
// (docs/decisions/0018-core-transport-messageport.md).
export const createPluginHostProcess = ({
	entry,
	onPort,
	log,
}: PluginHostOptions) => {
	let child: UtilityProcess | undefined;

	const stop = () => {
		child?.kill();
		child = undefined;
	};

	return {
		// Replaces any host still running.
		start() {
			stop();
			const host = utilityProcess.fork(entry, [], {
				serviceName: "yaa-plugin-host",
				stdio: "inherit",
			});
			child = host;
			host.once("spawn", () => {
				const { port1, port2 } = new MessageChannelMain();
				const connect: ToPluginHostMessage = { kind: "connect" };
				host.postMessage(connect, [port2]);
				onPort(port1);
			});
			host.on("exit", (code) => {
				if (child === host) child = undefined;
				log({
					at: Date.now(),
					level: code === 0 ? "info" : "error",
					source: "main",
					message: "plugin host exited",
					data: { code },
				});
			});
		},
		stop,
	};
};
