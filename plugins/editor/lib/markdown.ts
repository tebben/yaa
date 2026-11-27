import { Marked } from "marked";

export type MarkdownHeading = { id: string; text: string; depth: number };
export type MarkdownImage = { href: string; text: string };
export type MarkdownDocument = {
	html: string;
	headings: MarkdownHeading[];
	images: MarkdownImage[];
	diagrams: string[];
};

const escapeHtml = (text: string) =>
	text.replace(/[&<>"']/g, (character) => {
		switch (character) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			default:
				return "&#39;";
		}
	});

export const parseMarkdown = (text: string): MarkdownDocument => {
	const headings: MarkdownHeading[] = [];
	const images: MarkdownImage[] = [];
	const diagrams: string[] = [];
	const used = new Set<string>();
	const marked = new Marked({
		renderer: {
			heading({ tokens, depth }) {
				const title = this.parser.parseInline(tokens, this.parser.textRenderer);
				const name =
					title
						.toLowerCase()
						.replace(/[^\p{L}\p{N}\s_-]/gu, "")
						.trim()
						.replace(/\s+/g, "-") || "section";
				let id = name;
				let suffix = 0;
				while (used.has(id)) id = `${name}-${++suffix}`;
				used.add(id);
				headings.push({ id, text: title, depth });
				return `<h${depth} id="${escapeHtml(id)}">${this.parser.parseInline(tokens)}</h${depth}>`;
			},
			image({ href, text: alt }) {
				const index = images.push({ href, text: alt }) - 1;
				return `<img data-image="${index}" alt="${escapeHtml(alt)}">`;
			},
			code({ text: code, lang }) {
				if (lang?.trim().toLowerCase() !== "mermaid") return false;
				const index = diagrams.push(code) - 1;
				return `<div data-diagram="${index}"></div>`;
			},
			html({ text: html }) {
				return escapeHtml(html);
			},
		},
	});
	return {
		html: marked.parse(text, { async: false }),
		headings,
		images,
		diagrams,
	};
};

// Resolve a URL-relative worktree path without letting it escape the root.
export const resolveMarkdownPath = (
	document: string,
	href: string,
): string | undefined => {
	let decoded: string;
	try {
		decoded = decodeURIComponent(href.split(/[?#]/)[0] ?? "");
	} catch {
		return undefined;
	}
	if (
		decoded === "" ||
		decoded.includes("\\") ||
		/^[a-z][a-z0-9+.-]*:/i.test(decoded)
	)
		return undefined;
	const parts = decoded.startsWith("/") ? [] : document.split("/").slice(0, -1);
	for (const part of decoded.split("/")) {
		if (part === "" || part === ".") continue;
		if (part === "..") {
			if (parts.length === 0) return undefined;
			parts.pop();
		} else if (part.toLowerCase() === ".git") return undefined;
		else parts.push(part);
	}
	return parts.length === 0 ? undefined : parts.join("/");
};
