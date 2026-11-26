import type * as z from "zod";
import {
	type EventName,
	eventSchema,
	type ParamsIn,
	type PayloadOut,
	type ProtocolDefinition,
	type RequestName,
	type ResultOut,
	resultSchema,
	safeParse,
} from "./define.ts";
import type { Disposable } from "./disposable.ts";
import type { Port } from "./port.ts";
import { ProtocolError } from "./protocol-error.ts";
import { type requestMessage, serverMessage } from "./wire.ts";

export type Client<P extends ProtocolDefinition> = {
	request<M extends RequestName<P>>(
		method: M,
		params: ParamsIn<P, M>,
	): Promise<ResultOut<P, M>>;
	subscribe<E extends EventName<P>>(
		event: E,
		listener: (payload: PayloadOut<P, E>) => void,
	): Disposable;
	// Hands the client a port to the server. Called again with a fresh port
	// after the server restarts: subscriptions are sent again, and requests
	// made while no port was attached go out then.
	attach(port: Port): void;
};

type Pending = {
	resolve(result: unknown): void;
	reject(error: ProtocolError): void;
};

export const createClient = <P extends ProtocolDefinition>(
	protocol: P,
): Client<P> => {
	let port: Port | undefined;
	let nextId = 0;
	const pending = new Map<number, Pending>();
	const queued: z.infer<typeof requestMessage>[] = [];
	const listeners = new Map<string, Set<(payload: unknown) => void>>();

	const receive = (raw: unknown): void => {
		// The server is ours: a malformed message is a bug, so it throws.
		const message = serverMessage.parse(raw);
		if (message.kind === "event") {
			for (const listener of listeners.get(message.event) ?? []) {
				listener(message.payload);
			}
			return;
		}
		const request = pending.get(message.id);
		pending.delete(message.id);
		if (message.kind === "result") request?.resolve(message.result);
		else request?.reject(new ProtocolError(message.code, message.message));
	};

	const lose = (lost: Port): void => {
		if (port !== lost) return;
		port = undefined;
		const error = new ProtocolError(
			"connection_lost",
			"The connection closed before the reply arrived",
		);
		for (const request of pending.values()) request.reject(error);
		pending.clear();
	};

	return {
		request(method, params) {
			const id = nextId++;
			const result = resultSchema(protocol, method);
			return new Promise((resolve, reject) => {
				pending.set(id, {
					resolve(raw) {
						const parsed = safeParse(result, raw);
						if (parsed.success) resolve(parsed.data);
						else
							reject(
								new ProtocolError(
									"invalid_result",
									`Invalid result for ${method}: ${parsed.error.message}`,
								),
							);
					},
					reject,
				});
				const message = { kind: "request" as const, id, method, params };
				if (port === undefined) queued.push(message);
				else port.postMessage(message);
			});
		},

		subscribe(event, listener) {
			const schema = eventSchema(protocol, event);
			// Parsed per subscription so the listener gets the schema's type.
			const wrapped = (payload: unknown) => {
				const parsed = safeParse(schema, payload);
				// The server is ours: a payload that breaks its schema is a bug.
				if (!parsed.success) throw parsed.error;
				listener(parsed.data);
			};
			let eventListeners = listeners.get(event);
			if (eventListeners === undefined) {
				eventListeners = new Set();
				listeners.set(event, eventListeners);
				port?.postMessage({ kind: "subscribe", event });
			}
			eventListeners.add(wrapped);
			return {
				dispose() {
					const current = listeners.get(event);
					if (current?.delete(wrapped) !== true || current.size > 0) return;
					listeners.delete(event);
					port?.postMessage({ kind: "unsubscribe", event });
				},
			};
		},

		attach(next) {
			port = next;
			next.onMessage(receive);
			next.onClose(() => lose(next));
			for (const event of listeners.keys()) {
				next.postMessage({ kind: "subscribe", event });
			}
			for (const message of queued.splice(0)) next.postMessage(message);
		},
	};
};
