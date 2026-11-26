import {
	type EventName,
	type ParamsOut,
	type PayloadIn,
	type ProtocolDefinition,
	paramsSchema,
	type RequestName,
	type ResultIn,
	safeParse,
} from "./define.ts";
import type { Port } from "./port.ts";
import { clientMessage, type ErrorCode } from "./wire.ts";

export type Handlers<P extends ProtocolDefinition> = {
	[M in RequestName<P>]: (
		params: ParamsOut<P, M>,
	) => ResultIn<P, M> | Promise<ResultIn<P, M>>;
};

export type Server<P extends ProtocolDefinition> = {
	connect(port: Port): void;
	// Sends the event to every connection subscribed to it.
	emit<E extends EventName<P>>(event: E, payload: PayloadIn<P, E>): void;
};

export type ServerOptions = {
	// A client sent something the protocol rejects, or a handler threw. The
	// client already got an error reply where it had a request id.
	onError(error: unknown): void;
};

type Connection = { port: Port; events: Set<string> };

const describe = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

export const createServer = <P extends ProtocolDefinition>(
	protocol: P,
	handlers: Handlers<P>,
	options: ServerOptions,
): Server<P> => {
	const connections = new Set<Connection>();

	const isRequest = (method: string): method is RequestName<P> =>
		Object.hasOwn(protocol.requests, method);
	const isEvent = (event: string): event is EventName<P> =>
		Object.hasOwn(protocol.events, event);

	const run = async <M extends RequestName<P>>(
		method: M,
		raw: unknown,
	): Promise<
		| { ok: true; result: ResultIn<P, M> }
		| { ok: false; code: ErrorCode; message: string }
	> => {
		const params = safeParse(paramsSchema(protocol, method), raw);
		if (!params.success) {
			options.onError(params.error);
			return {
				ok: false,
				code: "invalid_params",
				message: params.error.message,
			};
		}
		try {
			return { ok: true, result: await handlers[method](params.data) };
		} catch (error) {
			options.onError(error);
			return { ok: false, code: "handler_failed", message: describe(error) };
		}
	};

	const receive = async (connection: Connection, raw: unknown) => {
		const parsed = clientMessage.safeParse(raw);
		if (!parsed.success) {
			options.onError(parsed.error);
			return;
		}
		const message = parsed.data;
		if (message.kind !== "request") {
			if (!isEvent(message.event)) {
				options.onError(new Error(`Unknown event ${message.event}`));
			} else if (message.kind === "subscribe") {
				connection.events.add(message.event);
			} else {
				connection.events.delete(message.event);
			}
			return;
		}
		const { id, method } = message;
		if (!isRequest(method)) {
			options.onError(new Error(`Unknown method ${method}`));
			connection.port.postMessage({
				kind: "error",
				id,
				code: "unknown_method",
				message: `Unknown method ${method}`,
			});
			return;
		}
		const outcome = await run(method, message.params);
		if (!connections.has(connection)) return;
		connection.port.postMessage(
			outcome.ok
				? { kind: "result", id, result: outcome.result }
				: { kind: "error", id, code: outcome.code, message: outcome.message },
		);
	};

	return {
		connect(port) {
			const connection: Connection = { port, events: new Set() };
			connections.add(connection);
			port.onMessage((raw) => {
				void receive(connection, raw);
			});
			port.onClose(() => connections.delete(connection));
		},

		emit(event, payload) {
			for (const connection of connections) {
				if (connection.events.has(event)) {
					connection.port.postMessage({ kind: "event", event, payload });
				}
			}
		},
	};
};
