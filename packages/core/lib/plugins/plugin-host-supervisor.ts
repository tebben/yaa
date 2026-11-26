import { type Client, createClient } from "@yaa/contracts/client";
import type { Logger, LogRecord } from "@yaa/contracts/log";
import {
	type PluginEvent,
	type PluginHostProtocol,
	pluginHostProtocol,
} from "@yaa/contracts/plugin-host-protocol";
import { type Port, splitPort } from "@yaa/contracts/protocol";
import { CRASH_LIMIT, recordCrash } from "./crash-budget.ts";

export type PluginHostClient = Client<PluginHostProtocol>;

export type PluginHostSupervisorOptions = {
	// Asks main to fork a host; its port arrives through `attach`.
	requestHost(): void;
	// The host's log lines, for the core's log file.
	write(record: LogRecord): void;
	// An event a plugin's backend sends its UI.
	onEvent(event: PluginEvent): void;
	// Serves the plugin API to a host on its half of the port.
	serve(port: Port): void;
	log: Logger;
	// The host went away. Whatever it had activated is gone with it.
	onLost(): void;
	now?: () => number;
};

// Decides when the plugin host runs (docs/spec/00-overview.md): it starts
// on first use, and after it crashes it starts again on the next use, until
// it crashes too often.
export const createPluginHostSupervisor = ({
	requestHost,
	write,
	onEvent,
	serve,
	log,
	onLost,
	now = Date.now,
}: PluginHostSupervisorOptions) => {
	// The host being started or running. Requests made before its port
	// arrives wait in the client.
	let current: PluginHostClient | undefined;
	let crashes: number[] = [];
	let stopped = false;

	const start = (): PluginHostClient => {
		const client = createClient(pluginHostProtocol);
		client.subscribe("log", write);
		client.subscribe("plugin.event", onEvent);
		current = client;
		log.info("starting the plugin host");
		requestHost();
		return client;
	};

	const lost = () => {
		current = undefined;
		const crash = recordCrash(crashes, now());
		crashes = crash.crashes;
		if (crash.exhausted) {
			stopped = true;
			log.error(
				`the plugin host stopped ${CRASH_LIMIT} times within a minute; not restarting it`,
			);
		} else {
			log.warn("the plugin host stopped");
		}
		onLost();
	};

	return {
		client(): PluginHostClient {
			if (stopped) {
				throw new Error(
					"The plugin host kept crashing and was stopped. Restart yaa to try again.",
				);
			}
			return current ?? start();
		},
		// The port to the host main forked on request.
		attach(port: Port) {
			if (current === undefined) {
				log.warn("a plugin host port arrived that nothing asked for");
				port.close();
				return;
			}
			const { serving, calling } = splitPort(port);
			serve(serving);
			current.attach(calling);
			port.onClose(lost);
		},
	};
};
