import { describe, expect, it } from "vitest";
import { neighbour } from "../dock.ts";

const box = (left: number, top: number, right: number, bottom: number) => ({
	left,
	top,
	right,
	bottom,
});

// Chat and Files side by side above a full-width Terminal.
const chat = box(0, 0, 100, 50);
const files = box(100, 0, 300, 50);
const terminal = box(0, 50, 300, 100);
const grid = [chat, files, terminal];

describe("neighbour", () => {
	it("finds a narrower panel above a wide one", () => {
		expect(neighbour(terminal, grid, "up")).toBe(1);
	});

	it("finds the wide panel below either narrow one", () => {
		expect(neighbour(chat, grid, "down")).toBe(2);
		expect(neighbour(files, grid, "down")).toBe(2);
	});

	it("finds side neighbours and nothing at the grid's edge", () => {
		expect(neighbour(chat, grid, "right")).toBe(1);
		expect(neighbour(files, grid, "left")).toBe(0);
		expect(neighbour(chat, grid, "left")).toBeUndefined();
		expect(neighbour(chat, grid, "up")).toBeUndefined();
		expect(neighbour(terminal, grid, "down")).toBeUndefined();
	});

	it("prefers the nearest panel over a farther one in line", () => {
		const top = box(0, 0, 100, 30);
		const middle = box(0, 30, 100, 60);
		const bottom = box(0, 60, 100, 90);
		expect(neighbour(bottom, [top, middle, bottom], "up")).toBe(1);
	});
});
