import DOMPurify from "dompurify";
import type { editor } from "monaco-editor/editor";
import type { Attachment } from "svelte/attachments";
import { createSubscriber } from "svelte/reactivity";
import {
	type MarkdownDocument,
	parseMarkdown,
	resolveMarkdownPath,
} from "./markdown.ts";

type ImageData = { data: string; mime: string };
type Options = {
	path: string;
	document: MarkdownDocument;
	remote: boolean;
	read(path: string): Promise<ImageData>;
	fetch(url: string): Promise<ImageData>;
	open(path: string): void;
};

const MIME: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	svg: "image/svg+xml",
};

export const imageMime = (path: string) =>
	MIME[path.split(".").at(-1)?.toLowerCase() ?? ""];

const svgUrl = (svg: string): string => {
	const clean = DOMPurify.sanitize(svg, {
		USE_PROFILES: { svg: true, svgFilters: true },
		FORBID_TAGS: ["foreignObject", "script"],
	});
	return `data:image/svg+xml,${encodeURIComponent(clean)}`;
};

const imageUrl = ({ data, mime }: ImageData): string => {
	if (mime !== "image/svg+xml") return `data:${mime};base64,${data}`;
	const bytes = Uint8Array.from(atob(data), (character) =>
		character.charCodeAt(0),
	);
	return svgUrl(new TextDecoder().decode(bytes));
};

export const createMarkdownSource = (model: () => editor.ITextModel) => {
	const subscribe = createSubscriber((update) => {
		const listener = model().onDidChangeContent(update);
		return () => listener.dispose();
	});
	return {
		get document() {
			subscribe();
			return parseMarkdown(model().getValue());
		},
	};
};

let diagramId = 0;

export const attachMarkdown =
	(options: Options): Attachment<HTMLElement> =>
	(element) => {
		let alive = true;
		element.replaceChildren(
			DOMPurify.sanitize(options.document.html, {
				RETURN_DOM_FRAGMENT: true,
				FORBID_TAGS: ["style", "iframe", "object"],
			}),
		);
		const click = (event: MouseEvent) => {
			if (!(event.target instanceof Element)) return;
			const link = event.target.closest("a");
			if (link === null) return;
			const href = link.getAttribute("href") ?? "";
			if (href.startsWith("#")) {
				event.preventDefault();
				let id: string;
				try {
					id = decodeURIComponent(href.slice(1));
				} catch {
					return;
				}
				element.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView();
				return;
			}
			const path = resolveMarkdownPath(options.path, href);
			if (path !== undefined) {
				event.preventDefault();
				options.open(path);
			} else if (!/^https?:\/\//i.test(href)) event.preventDefault();
		};
		element.addEventListener("click", click);
		for (const link of element.querySelectorAll("a[href]")) {
			if (/^https?:\/\//i.test(link.getAttribute("href") ?? "")) {
				link.setAttribute("target", "_blank");
				link.setAttribute("rel", "noreferrer");
			}
		}
		for (const [index, image] of options.document.images.entries()) {
			const node = element.querySelector(`img[data-image="${index}"]`);
			if (!(node instanceof HTMLImageElement)) continue;
			const remote = /^https:\/\//i.test(image.href);
			if (remote && !options.remote) continue;
			const path = remote
				? undefined
				: resolveMarkdownPath(options.path, image.href);
			const load = remote
				? options.fetch(image.href)
				: path === undefined
					? Promise.reject(new Error("Not a worktree image"))
					: options.read(path);
			load
				.then((result) => {
					if (alive) node.src = imageUrl(result);
				})
				.catch((error: unknown) => {
					if (alive)
						node.alt = `${image.text || image.href}: ${error instanceof Error ? error.message : String(error)}`;
				});
		}
		if (options.document.diagrams.length > 0) {
			void import("mermaid")
				.then(async ({ default: mermaid }) => {
					mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
					for (const [index, code] of options.document.diagrams.entries()) {
						const node = element.querySelector(`[data-diagram="${index}"]`);
						if (!(node instanceof HTMLElement)) continue;
						try {
							const { svg } = await mermaid.render(
								`yaa-mermaid-${diagramId++}`,
								code,
							);
							if (!alive) break;
							const image = document.createElement("img");
							image.alt = "Mermaid diagram";
							image.src = svgUrl(svg);
							node.replaceChildren(image);
						} catch (error) {
							if (alive)
								node.textContent = `Mermaid: ${error instanceof Error ? error.message : String(error)}`;
						}
					}
				})
				.catch((error: unknown) => {
					if (alive)
						element.append(
							`Mermaid: ${error instanceof Error ? error.message : String(error)}`,
						);
				});
		}
		return () => {
			alive = false;
			element.removeEventListener("click", click);
		};
	};
