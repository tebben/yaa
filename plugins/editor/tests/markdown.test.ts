import { describe, expect, it } from "vitest";
import { parseMarkdown, resolveMarkdownPath } from "../markdown.ts";

describe("Markdown preview", () => {
	it("collects headings, images and Mermaid without loading them", () => {
		const result = parseMarkdown(
			"# One\n\n## One\n\n![alt](../image.png)\n\n```mermaid\ngraph TD\nA-->B\n```",
		);
		expect(result.headings.map((heading) => heading.id)).toEqual([
			"one",
			"one-1",
		]);
		expect(result.images).toEqual([{ href: "../image.png", text: "alt" }]);
		expect(result.diagrams).toEqual(["graph TD\nA-->B"]);
		expect(result.html).not.toContain("../image.png");
	});

	it("does not render raw HTML", () => {
		expect(parseMarkdown("<script>alert(1)</script>").html).not.toContain(
			"<script>",
		);
	});

	it("makes distinct anchors and outlines without Markdown markup", () => {
		const result = parseMarkdown("# **One**\n\n# One-1\n\n# One\n\n# !!");
		expect(result.headings.map(({ id, text }) => [id, text])).toEqual([
			["one", "One"],
			["one-1", "One-1"],
			["one-2", "One"],
			["section", "!!"],
		]);
	});

	it("resolves paths relative to the document without leaving the worktree", () => {
		expect(resolveMarkdownPath("docs/guide.md", "../image.png")).toBe(
			"image.png",
		);
		expect(resolveMarkdownPath("docs/guide.md", "/image.png")).toBe(
			"image.png",
		);
		expect(
			resolveMarkdownPath("docs/guide.md", "../../secret"),
		).toBeUndefined();
		expect(
			resolveMarkdownPath("docs/guide.md", "../.git/config"),
		).toBeUndefined();
		expect(
			resolveMarkdownPath("docs/guide.md", "https://example.com/a.png"),
		).toBeUndefined();
	});
});
