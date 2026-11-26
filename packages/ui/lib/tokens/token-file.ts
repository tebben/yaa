import * as z from "zod";

const group = z.record(z.string(), z.string());

// The shape of docs/design/tokens.json. Density is left out until a second
// density ships: with only one, it would multiply every size by 1.
export const tokenFile = z.object({
	font: z.object({
		sans: z.string(),
		mono: z.string(),
		size: group,
		lineHeight: group,
		weight: group,
	}),
	radius: group,
	shadow: group,
	space: group,
	size: group,
	color: z.record(z.string(), z.union([z.string(), group])),
});

export type TokenFile = z.infer<typeof tokenFile>;
