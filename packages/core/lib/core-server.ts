import { coreProtocol } from "@yaa/contracts/core-protocol";
import { createServer, type Server } from "@yaa/contracts/server";

export const createCoreServer = (): Server<typeof coreProtocol> => {
	const startedAt = Date.now();
	return createServer(
		coreProtocol,
		{
			"core.info": () => ({
				electron: process.versions.electron ?? "",
				node: process.versions.node,
				startedAt,
			}),
		},
		// Until the log files land (M1 step 2), stderr reaches main's console.
		{ onError: (error) => console.error("core:", error) },
	);
};
