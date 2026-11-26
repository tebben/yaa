import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { createClient } from "../client.ts";
import { defineProtocol, ProtocolError } from "../protocol.ts";
import { createServer, type Handlers } from "../server.ts";
import { createPortPair } from "./port-pair.ts";

const testProtocol = defineProtocol({
	requests: {
		add: {
			params: z.object({ a: z.number(), b: z.number() }),
			result: z.object({ sum: z.number() }),
		},
		fail: { params: z.object({}), result: z.object({}) },
		lie: { params: z.object({}), result: z.object({ name: z.string() }) },
	},
	events: {
		tick: z.object({ n: z.number() }),
	},
});

const handlers: Handlers<typeof testProtocol> = {
	add: ({ a, b }) => ({ sum: a + b }),
	fail: () => {
		throw new Error("disk full");
	},
	// A handler that breaks its own contract, typed as the server sees it.
	lie: () => JSON.parse('{"name": 1}'),
};

const setup = () => {
	const onError = vi.fn();
	const server = createServer(testProtocol, handlers, { onError });
	const connect = () => {
		const client = createClient(testProtocol);
		const [clientEnd, serverEnd] = createPortPair();
		server.connect(serverEnd);
		client.attach(clientEnd);
		return { client, clientEnd };
	};
	return { server, onError, connect };
};

const errorCode = (promise: Promise<unknown>) =>
	promise.then(
		() => "resolved",
		(error: unknown) => (error instanceof ProtocolError ? error.code : error),
	);

describe("protocol", () => {
	it("tells a handler when its caller's connection goes", async () => {
		const gone = vi.fn();
		const server = createServer(
			testProtocol,
			{
				...handlers,
				add: ({ a, b }, caller) => {
					caller.onClose(gone);
					return { sum: a + b };
				},
			},
			{ onError: vi.fn() },
		);
		const client = createClient(testProtocol);
		const [clientEnd, serverEnd] = createPortPair();
		server.connect(serverEnd);
		client.attach(clientEnd);
		await client.request("add", { a: 1, b: 1 });
		expect(gone).not.toHaveBeenCalled();
		clientEnd.close();
		await vi.waitFor(() => expect(gone).toHaveBeenCalledOnce());
	});

	it("answers a request with the parsed result", async () => {
		const { client } = setup().connect();
		await expect(client.request("add", { a: 2, b: 3 })).resolves.toEqual({
			sum: 5,
		});
	});

	it("rejects params the schema refuses and reports it on the server", async () => {
		const { onError, connect } = setup();
		const { client } = connect();
		const bad = JSON.parse('{"a": "2", "b": 3}');
		expect(await errorCode(client.request("add", bad))).toBe("invalid_params");
		expect(onError).toHaveBeenCalledOnce();
	});

	it("turns a throwing handler into a handler_failed error", async () => {
		const { client } = setup().connect();
		const error = await client.request("fail", {}).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ProtocolError);
		expect(error).toMatchObject({
			code: "handler_failed",
			message: "disk full",
		});
	});

	it("rejects a result the schema refuses", async () => {
		const { client } = setup().connect();
		expect(await errorCode(client.request("lie", {}))).toBe("invalid_result");
	});

	it("answers an unknown method with an error", async () => {
		const { onError, server } = setup();
		const [clientEnd, serverEnd] = createPortPair();
		server.connect(serverEnd);
		const reply = new Promise((resolve) => clientEnd.onMessage(resolve));
		clientEnd.postMessage({
			kind: "request",
			id: 7,
			method: "nope",
			params: {},
		});
		expect(await reply).toMatchObject({
			kind: "error",
			id: 7,
			code: "unknown_method",
		});
		expect(onError).toHaveBeenCalledOnce();
	});

	it("sends events only to subscribed clients, until they unsubscribe", async () => {
		const { server, connect } = setup();
		const subscribed = connect().client;
		const other = connect().client;
		const ticks: number[] = [];
		const otherTicks: number[] = [];
		const subscription = subscribed.subscribe("tick", ({ n }) => ticks.push(n));
		other.subscribe("tick", ({ n }) => otherTicks.push(n));
		await subscribed.request("add", { a: 0, b: 0 });
		await other.request("add", { a: 0, b: 0 });

		server.emit("tick", { n: 1 });
		await subscribed.request("add", { a: 0, b: 0 });
		subscription.dispose();
		await subscribed.request("add", { a: 0, b: 0 });
		server.emit("tick", { n: 2 });
		await subscribed.request("add", { a: 0, b: 0 });
		await other.request("add", { a: 0, b: 0 });

		expect(ticks).toEqual([1]);
		expect(otherTicks).toEqual([1, 2]);
	});

	it("rejects pending requests when the port closes, then resumes on a new port", async () => {
		const { server, connect } = setup();
		const { client, clientEnd } = connect();
		const ticks: number[] = [];
		client.subscribe("tick", ({ n }) => ticks.push(n));
		const inFlight = client.request("add", { a: 1, b: 1 });
		clientEnd.close();
		expect(await errorCode(inFlight)).toBe("connection_lost");

		const queued = client.request("add", { a: 2, b: 2 });
		const [nextClientEnd, nextServerEnd] = createPortPair();
		server.connect(nextServerEnd);
		client.attach(nextClientEnd);
		await expect(queued).resolves.toEqual({ sum: 4 });

		server.emit("tick", { n: 3 });
		await client.request("add", { a: 0, b: 0 });
		expect(ticks).toEqual([3]);
	});
});
