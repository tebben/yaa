import type { ErrorCode } from "./wire.ts";

export class ProtocolError extends Error {
	readonly code: ErrorCode;

	constructor(code: ErrorCode, message: string) {
		super(message);
		this.name = "ProtocolError";
		this.code = code;
	}
}
