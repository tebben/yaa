export type NumberRange = { min: number; max: number; step: number };

// `value` moved by a number of steps and kept between min and max. A step
// lands on the step grid from min, so 13 with a step of 2 from 0 goes to 14
// or 12; the result is rounded so 0.1 steps do not drift.
export const stepNumber = (
	value: number,
	steps: number,
	{ min, max, step }: NumberRange,
): number => {
	const offset = (value - min) / step;
	const snapped =
		steps > 0
			? Math.floor(offset + 1e-9) + steps
			: steps < 0
				? Math.ceil(offset - 1e-9) + steps
				: offset;
	const next = min + snapped * step;
	return Math.min(max, Math.max(min, Number(next.toFixed(6))));
};
