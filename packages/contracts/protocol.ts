export {
	defineProtocol,
	type EventName,
	type ParamsIn,
	type ParamsOut,
	type PayloadIn,
	type PayloadOut,
	type ProtocolDefinition,
	type RequestName,
	type ResultIn,
	type ResultOut,
} from "./lib/define.ts";
export type { Disposable } from "./lib/disposable.ts";
export { fromMessagePortMain } from "./lib/message-port-main.ts";
export type { Port } from "./lib/port.ts";
export { ProtocolError } from "./lib/protocol-error.ts";
export type { ErrorCode } from "./lib/wire.ts";
