// Entry of the core process, forked by Electron main as a utilityProcess
// (docs/decisions/0018-core-transport-messageport.md).
import {
	type FromCoreMessage,
	type PickTarget,
	toCoreMessage,
} from "@yaa/contracts/process-control";
import { fromMessagePortMain } from "@yaa/contracts/protocol";
import { type Core, startCore } from "./lib/start-core.ts";

const parent = process.parentPort;
let core: Core | undefined;
// Picks waiting for main's answer, by id.
const picks = new Map<number, (paths: string[]) => void>();
let nextPick = 0;

const send = (message: FromCoreMessage) => parent.postMessage(message);

const pick = (target: PickTarget) =>
	new Promise<string[]>((resolve) => {
		const id = nextPick++;
		picks.set(id, resolve);
		send({ kind: "pick", id, target });
	});

const started = (): Core => {
	if (core === undefined) throw new Error("Message before start");
	return core;
};

parent.on("message", (event) => {
	const message = toCoreMessage.parse(event.data);
	switch (message.kind) {
		case "start": {
			if (core !== undefined) throw new Error("Started twice");
			core = startCore({
				dataDir: message.dataDir,
				logDir: message.logDir,
				pluginsDir: message.pluginsDir,
				dev: message.dev,
				requestPluginHost: () => send({ kind: "start-plugin-host" }),
				pick,
			});
			send({ kind: "ready" });
			return;
		}
		case "connect": {
			const [port] = event.ports;
			if (port === undefined) throw new Error("connect without a port");
			started().connect(fromMessagePortMain(port));
			return;
		}
		case "plugin-host": {
			const [port] = event.ports;
			if (port === undefined) throw new Error("plugin-host without a port");
			started().attachPluginHost(fromMessagePortMain(port));
			return;
		}
		case "log":
			started().log(message.record);
			return;
		case "picked":
			picks.get(message.id)?.(message.paths);
			picks.delete(message.id);
			return;
	}
});
