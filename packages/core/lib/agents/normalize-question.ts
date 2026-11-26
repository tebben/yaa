import type { QuestionField } from "@yaa/contracts/agent-events";
import * as z from "zod";

// The parts of an ACP form elicitation's JSON Schema the app can ask for:
// text, numbers, yes or no, and one or several of a list of choices
// (docs/decisions/0014-acp-coverage.md). The schema comes from the agent, so
// it is parsed here rather than trusted.

const option = z.object({ const: z.string(), title: z.string() });
const described = { title: z.string().nullish() };

const property = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("string"),
		...described,
		enum: z.array(z.string()).nullish(),
		oneOf: z.array(option).nullish(),
	}),
	z.object({ type: z.literal("number"), ...described }),
	z.object({ type: z.literal("integer"), ...described }),
	z.object({ type: z.literal("boolean"), ...described }),
	z.object({
		type: z.literal("array"),
		...described,
		items: z.union([
			z.object({ enum: z.array(z.string()) }),
			z.object({ anyOf: z.array(option) }),
		]),
	}),
]);

const formSchema = z.object({
	properties: z.record(z.string(), z.unknown()).optional(),
	required: z.array(z.string()).nullish(),
});

type Choice = { value: string; label: string };

const fromEnum = (values: string[]): Choice[] =>
	values.map((value) => ({ value, label: value }));
const fromOptions = (options: z.infer<typeof option>[]): Choice[] =>
	options.map(({ const: value, title }) => ({ value, label: title }));

const field = (
	name: string,
	schema: z.infer<typeof property>,
	required: boolean,
): QuestionField => {
	const base = { name, title: schema.title ?? name, required };
	switch (schema.type) {
		case "string": {
			const choices = schema.oneOf
				? fromOptions(schema.oneOf)
				: schema.enum && fromEnum(schema.enum);
			return choices
				? { kind: "choice", ...base, multiple: false, choices }
				: { kind: "text", ...base };
		}
		case "number":
		case "integer":
			return { kind: "number", ...base, integer: schema.type === "integer" };
		case "boolean":
			return { kind: "boolean", ...base };
		case "array":
			return {
				kind: "choice",
				...base,
				multiple: true,
				choices:
					"enum" in schema.items
						? fromEnum(schema.items.enum)
						: fromOptions(schema.items.anyOf),
			};
	}
};

export type NormalizedQuestion = {
	fields: QuestionField[];
	// Names of the properties the app cannot show, so it cannot answer them.
	unsupported: string[];
};

export const normalizeQuestion = (schema: unknown): NormalizedQuestion => {
	const form = formSchema.safeParse(schema);
	if (!form.success) return { fields: [], unsupported: ["(schema)"] };
	const required = new Set(form.data.required ?? []);
	const fields: QuestionField[] = [];
	const unsupported: string[] = [];
	for (const [name, raw] of Object.entries(form.data.properties ?? {})) {
		const parsed = property.safeParse(raw);
		if (parsed.success)
			fields.push(field(name, parsed.data, required.has(name)));
		else unsupported.push(name);
	}
	return { fields, unsupported };
};
