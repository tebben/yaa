import * as z from "zod";

// The envelope around every protocol message. Payloads stay `unknown` here and
// are parsed against the protocol definition by the receiving end.

export const errorCodes = [
	"unknown_method",
	"invalid_params",
	"handler_failed",
	"invalid_result",
	"connection_lost",
] as const;
export type ErrorCode = (typeof errorCodes)[number];

const id = z.number().int().nonnegative();

export const requestMessage = z.object({
	kind: z.literal("request"),
	id,
	method: z.string(),
	params: z.unknown(),
});

export const subscribeMessage = z.object({
	kind: z.literal("subscribe"),
	event: z.string(),
});

export const unsubscribeMessage = z.object({
	kind: z.literal("unsubscribe"),
	event: z.string(),
});

export const clientMessage = z.discriminatedUnion("kind", [
	requestMessage,
	subscribeMessage,
	unsubscribeMessage,
]);

const resultMessage = z.object({
	kind: z.literal("result"),
	id,
	result: z.unknown(),
});

const errorMessage = z.object({
	kind: z.literal("error"),
	id,
	code: z.enum(errorCodes),
	message: z.string(),
});

const eventMessage = z.object({
	kind: z.literal("event"),
	event: z.string(),
	payload: z.unknown(),
});

export const serverMessage = z.discriminatedUnion("kind", [
	resultMessage,
	errorMessage,
	eventMessage,
]);

export type ClientMessage = z.infer<typeof clientMessage>;
export type ServerMessage = z.infer<typeof serverMessage>;
