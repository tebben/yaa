import type { CoreProtocol } from "@yaa/contracts/core-protocol";
import type { ResultOut } from "@yaa/contracts/protocol";
import type { CoreClient } from "./core-connection.ts";

type CoreInfo = ResultOut<CoreProtocol, "core.info">;

export const createCoreInfo = (client: CoreClient) => {
	let info = $state<CoreInfo>();
	let error = $state<string>();
	client.request("core.info", {}).then(
		(result) => {
			info = result;
		},
		(reason: unknown) => {
			error = String(reason);
		},
	);
	return {
		get info() {
			return info;
		},
		get error() {
			return error;
		},
	};
};

export type CoreInfoController = ReturnType<typeof createCoreInfo>;
