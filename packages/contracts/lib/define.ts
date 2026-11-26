import type * as z from "zod";

export type RequestDefinition = {
	params: z.ZodType;
	result: z.ZodType;
};

export type ProtocolDefinition = {
	requests: Record<string, RequestDefinition>;
	events: Record<string, z.ZodType>;
};

export type RequestName<P extends ProtocolDefinition> = keyof P["requests"] &
	string;
export type EventName<P extends ProtocolDefinition> = keyof P["events"] &
	string;

// What a sender writes (schema input) and what a receiver gets after parsing
// (schema output). They differ once a schema has defaults or transforms.
export type ParamsIn<
	P extends ProtocolDefinition,
	M extends RequestName<P>,
> = z.input<P["requests"][M]["params"]>;
export type ParamsOut<
	P extends ProtocolDefinition,
	M extends RequestName<P>,
> = z.output<P["requests"][M]["params"]>;
export type ResultIn<
	P extends ProtocolDefinition,
	M extends RequestName<P>,
> = z.input<P["requests"][M]["result"]>;
export type ResultOut<
	P extends ProtocolDefinition,
	M extends RequestName<P>,
> = z.output<P["requests"][M]["result"]>;
export type PayloadIn<
	P extends ProtocolDefinition,
	E extends EventName<P>,
> = z.input<P["events"][E]>;
export type PayloadOut<
	P extends ProtocolDefinition,
	E extends EventName<P>,
> = z.output<P["events"][E]>;

export const defineProtocol = <const P extends ProtocolDefinition>(
	protocol: P,
): P => protocol;

// Typed lookups. Reading the record through an annotated local keeps the
// generic index type (with noUncheckedIndexedAccess a direct read widens to
// the constraint plus undefined), and parsing through a generic keeps the
// schema's output type.
export const paramsSchema = <
	P extends ProtocolDefinition,
	M extends RequestName<P>,
>(
	protocol: P,
	method: M,
): P["requests"][M]["params"] => {
	const requests: P["requests"] = protocol.requests;
	const request: P["requests"][M] = requests[method];
	return request.params;
};

export const resultSchema = <
	P extends ProtocolDefinition,
	M extends RequestName<P>,
>(
	protocol: P,
	method: M,
): P["requests"][M]["result"] => {
	const requests: P["requests"] = protocol.requests;
	const request: P["requests"][M] = requests[method];
	return request.result;
};

export const eventSchema = <
	P extends ProtocolDefinition,
	E extends EventName<P>,
>(
	protocol: P,
	event: E,
): P["events"][E] => {
	const events: P["events"] = protocol.events;
	return events[event];
};

export const safeParse = <T extends z.ZodType>(schema: T, data: unknown) =>
	schema.safeParse(data);
