import * as z from "zod";

// How far a worktree's agents go without asking
// (docs/spec/11-platform-services.md): ask for everything, ask for risky
// actions, or allow all.
export const permissionMode = z.enum(["ask", "risky", "allow"]);

export type PermissionMode = z.infer<typeof permissionMode>;

export const PERMISSION_MODE_LABELS: Record<PermissionMode, string> = {
	ask: "Ask for everything",
	risky: "Ask for risky actions",
	allow: "Allow all",
};

// How a provider applies the modes: the config option that carries them
// and, for each mode, the option's values that mean it, the best first, as
// an agent may offer only some of them.
export const permissionModeMapping = z.strictObject({
	option: z.string().min(1),
	values: z.strictObject({
		ask: z.array(z.string()).min(1),
		risky: z.array(z.string()).min(1),
		allow: z.array(z.string()).min(1),
	}),
});

export type PermissionModeMapping = z.infer<typeof permissionModeMapping>;

// A session config option as far as the modes need it.
type ConfigOption = {
	id: string;
	value: string | boolean;
	choices?: readonly { value: string }[] | undefined;
};

const mapped = (
	mapping: PermissionModeMapping,
	options: readonly ConfigOption[],
) => options.find(({ id }) => id === mapping.option);

// What applying the mode takes: nothing when the option has one of its
// values already, else the first of them the agent offers. `missing` when it
// offers none.
export const applyPermissionMode = (
	mapping: PermissionModeMapping,
	mode: PermissionMode,
	options: readonly ConfigOption[],
):
	| { action: "keep" }
	| { action: "set"; value: string }
	| { action: "missing" } => {
	const option = mapped(mapping, options);
	const wanted = mapping.values[mode];
	if (typeof option?.value === "string" && wanted.includes(option.value)) {
		return { action: "keep" };
	}
	const offered = new Set(option?.choices?.map(({ value }) => value));
	const value = wanted.find((candidate) => offered.has(candidate));
	return value === undefined ? { action: "missing" } : { action: "set", value };
};

// The mode the agent's current value of the option means, if any: an agent
// may be in a mode of its own, such as planning.
export const currentPermissionMode = (
	mapping: PermissionModeMapping,
	options: readonly ConfigOption[],
): PermissionMode | undefined => {
	const value = mapped(mapping, options)?.value;
	if (typeof value !== "string") return undefined;
	return permissionMode.options.find((mode) =>
		mapping.values[mode].includes(value),
	);
};
