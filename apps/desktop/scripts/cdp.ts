// A minimal Chrome DevTools Protocol client over Node's WebSocket, enough
// for the smoke test to drive a page: commands, and evaluating expressions
// that may return a promise. Every command has a deadline, so a window that
// stops answering fails the run instead of hanging it.
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

export const connect = (url: string, timeoutMs: number): Promise<Connection> =>
	new Promise((resolveOpen, rejectOpen) => {
		const socket = new WebSocket(url);
		const opening = setTimeout(() => {
			socket.close();
			rejectOpen(new Error(`Timed out connecting to ${url}`));
		}, timeoutMs);
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
		socket.addEventListener("open", () => {
			clearTimeout(opening);
			resolveOpen({
				send(method, params = {}) {
					next += 1;
					const id = next;
					socket.send(JSON.stringify({ id, method, params }));
					return new Promise((resolve, reject) => {
						const timer = setTimeout(() => {
							pending.delete(id);
							reject(new Error(`${method} got no reply in ${timeoutMs} ms`));
						}, timeoutMs);
						pending.set(id, {
							resolve(value) {
								clearTimeout(timer);
								resolve(value);
							},
							reject(error) {
								clearTimeout(timer);
								reject(error);
							},
						});
					});
				},
				close() {
					socket.close();
				},
			});
		});
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
