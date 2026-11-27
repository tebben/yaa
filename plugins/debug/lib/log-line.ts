import type { LogRecord } from "@yaa/contracts/log";

const two = (n: number) => String(n).padStart(2, "0");

// The local time of day a line was logged, to the millisecond.
export const timeOf = ({ at }: LogRecord): string => {
	const date = new Date(at);
	const ms = String(date.getMilliseconds()).padStart(3, "0");
	return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}.${ms}`;
};

// A line's data on one line, empty when it has none.
export const dataOf = ({ data }: LogRecord): string =>
	data === undefined ? "" : JSON.stringify(data);
