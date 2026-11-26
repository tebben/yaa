// The preload's only job: hand the page its port to the core
// (docs/decisions/0018-core-transport-messageport.md).
import {
	type CorePortMessage,
	connectCoreMessage,
	ipcChannels,
} from "@yaa/contracts/process-control";
import { ipcRenderer } from "electron";

const origin = window.location.origin;

window.addEventListener("message", (event) => {
	if (event.source !== window || event.origin !== origin) return;
	if (connectCoreMessage.safeParse(event.data).success) {
		ipcRenderer.send(ipcChannels.connectCore);
	}
});

ipcRenderer.on(ipcChannels.corePort, (event) => {
	const message: CorePortMessage = { kind: "yaa:core-port" };
	window.postMessage(message, origin, event.ports);
});
