import { coreProtocol } from "@yaa/contracts/core-protocol";
import { createServer, type Server } from "@yaa/contracts/server";
import { errorData, type Logger } from "./log/logger.ts";

export const createCoreServer = (log: Logger): Server<typeof coreProtocol> => {
	const startedAt = Date.now();
	return createServer(
		coreProtocol,
		{
			"core.info": () => ({
				electron: process.versions.electron,
				node: process.versions.node,
				startedAt,
			}),
		},
		{ onError: (error) => log.error("protocol error", errorData(error)) },
	);
};
