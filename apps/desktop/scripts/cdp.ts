// A minimal Chrome DevTools Protocol client over Node's WebSocket, enough
// for the smoke test to drive a page: commands, and evaluating expressions
// that may return a promise.
import { z } from "zod";

const reply = z.object({
	id: z.number().optional(),
	result: z.unknown().optional(),
	error: z.object({ message: z.string() }).optional(),
});

type Pending = { resolve(value: unknown): void; reject(error: Error): void };

export type Connection = {
	send(method: string, params?: Record<string, unknown>): Promise<unknown>;
	close(): void;
};

export const connect = (url: string): Promise<Connection> =>
	new Promise((resolveOpen, rejectOpen) => {
		const socket = new WebSocket(url);
		const pending = new Map<number, Pending>();
		let next = 0;

		socket.addEventListener("message", ({ data }) => {
			// Events carry no id; only replies are awaited.
			const { id, result, error } = reply.parse(JSON.parse(String(data)));
			const waiting = id === undefined ? undefined : pending.get(id);
			if (id === undefined || waiting === undefined) return;
			pending.delete(id);
			if (error) waiting.reject(new Error(error.message));
			else waiting.resolve(result);
		});
		socket.addEventListener("close", () => {
			for (const waiting of pending.values()) {
				waiting.reject(new Error("DevTools connection closed"));
			}
			pending.clear();
		});
		socket.addEventListener("error", () =>
			rejectOpen(new Error(`Cannot connect to ${url}`)),
		);
		socket.addEventListener("open", () =>
			resolveOpen({
				send(method, params = {}) {
					next += 1;
					const id = next;
					socket.send(JSON.stringify({ id, method, params }));
					return new Promise((resolve, reject) =>
						pending.set(id, { resolve, reject }),
					);
				},
				close() {
					socket.close();
				},
			}),
		);
	});

const evaluated = z.object({
	result: z.object({ value: z.unknown().optional() }),
	exceptionDetails: z
		.object({
			text: z.string(),
			exception: z.object({ description: z.string().optional() }).optional(),
		})
		.optional(),
});

// Evaluates an expression in the page, awaiting it when it is a promise, and
// returns its value, sent as JSON and checked against the schema.
export const evaluate = async <T>(
	page: Connection,
	expression: string,
	schema: z.ZodType<T>,
): Promise<T> => {
	const { result, exceptionDetails } = evaluated.parse(
		await page.send("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true,
		}),
	);
	if (exceptionDetails) {
		throw new Error(
			exceptionDetails.exception?.description ?? exceptionDetails.text,
		);
	}
	return schema.parse(result.value);
};
