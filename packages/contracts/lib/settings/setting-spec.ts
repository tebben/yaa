import * as z from "zod";

// How a setting shows on the settings page (docs/spec/11-platform-services.md).
// Core declares its settings with the builders below; a plugin declares the
// same shapes as JSON in plugin.json, and `settingSchema` turns them into
// the schemas that check settings.json.

const shared = {
	title: z.string().min(1),
	description: z.string().min(1).exactOptional(),
	// A boolean setting that has to be on for this one to apply, such as the
	// switch that turns a custom colour on.
	enabledBy: z.string().min(1).exactOptional(),
};

const choiceOption = z.strictObject({
	value: z.string(),
	label: z.string().min(1),
});

const hexColor = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Expected a colour as #rrggbb");

const booleanSpec = z.strictObject({
	type: z.literal("boolean"),
	default: z.boolean(),
	...shared,
});

const numberSpec = z.strictObject({
	type: z.literal("number"),
	default: z.number(),
	min: z.number(),
	max: z.number(),
	// What a step of the page's buttons adds.
	step: z.number().positive(),
	// Shown after the value, such as px.
	unit: z.string().min(1).exactOptional(),
	...shared,
});

const textSpec = z.strictObject({
	type: z.literal("text"),
	default: z.string(),
	// Shown while the field is empty, such as what an empty value stands for.
	placeholder: z.string().min(1).exactOptional(),
	// Rejects an empty value.
	required: z.boolean().exactOptional(),
	// Set in the mono font, for paths and templates.
	mono: z.boolean().exactOptional(),
	...shared,
});

const choiceSpec = z.strictObject({
	type: z.literal("choice"),
	default: z.string(),
	options: z.array(choiceOption).min(1),
	...shared,
});

const colorSpec = z.strictObject({
	type: z.literal("color"),
	default: hexColor,
	...shared,
});

const listSpec = z.strictObject({
	type: z.literal("list"),
	default: z.array(z.string()),
	placeholder: z.string().min(1).exactOptional(),
	mono: z.boolean().exactOptional(),
	...shared,
});

export const settingSpec = z
	.discriminatedUnion("type", [
		booleanSpec,
		numberSpec,
		textSpec,
		choiceSpec,
		colorSpec,
		listSpec,
	])
	.superRefine((spec, context) => {
		const issue = (path: string, message: string) =>
			context.addIssue({ code: "custom", path: [path], message });
		if (spec.type === "number") {
			if (spec.min > spec.max) issue("min", "Expected min at most max");
			if (spec.default < spec.min || spec.default > spec.max) {
				issue("default", "Expected a default between min and max");
			}
		}
		if (
			spec.type === "choice" &&
			!spec.options.some(({ value }) => value === spec.default)
		) {
			issue("default", "Expected one of the options");
		}
		if (spec.type === "text" && spec.required && spec.default === "") {
			issue("default", "Expected a default for a required setting");
		}
	});

export type SettingSpec = z.infer<typeof settingSpec>;
type Spec<T extends SettingSpec["type"]> = Omit<
	Extract<SettingSpec, { type: T }>,
	"type"
>;

// The spec of each setting that has one, by its schema.
export const settingSpecs = z.registry<SettingSpec>();

export const booleanSetting = (spec: Spec<"boolean">) =>
	z
		.boolean()
		.default(spec.default)
		.register(settingSpecs, { type: "boolean", ...spec });

export const numberSetting = (spec: Spec<"number">) =>
	z
		.number()
		.min(spec.min)
		.max(spec.max)
		.default(spec.default)
		.register(settingSpecs, { type: "number", ...spec });

export const textSetting = (spec: Spec<"text">) =>
	(spec.required ? z.string().min(1) : z.string())
		.default(spec.default)
		.register(settingSpecs, { type: "text", ...spec });

export const choiceSetting = <const V extends string>(
	spec: Omit<Spec<"choice">, "default" | "options"> & {
		default: NoInfer<V>;
		options: readonly { value: V; label: string }[];
	},
) =>
	z
		.enum(spec.options.map(({ value }) => value))
		.default(spec.default)
		.register(settingSpecs, {
			type: "choice",
			...spec,
			options: [...spec.options],
		});

export const colorSetting = (spec: Spec<"color">) =>
	hexColor
		.default(spec.default)
		.register(settingSpecs, { type: "color", ...spec });

export const listSetting = (spec: Spec<"list">) =>
	z
		.array(z.string())
		.default(spec.default)
		.register(settingSpecs, { type: "list", ...spec });

// The schema of a setting a plugin declares.
export const settingSchema = (spec: SettingSpec) => {
	switch (spec.type) {
		case "boolean":
			return booleanSetting(spec);
		case "number":
			return numberSetting(spec);
		case "text":
			return textSetting(spec);
		case "choice":
			return choiceSetting(spec);
		case "color":
			return colorSetting(spec);
		case "list":
			return listSetting(spec);
	}
};
