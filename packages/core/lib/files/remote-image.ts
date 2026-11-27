import type { RemoteImage } from "@yaa/contracts/worktree-files";

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
	"image/avif",
	"image/svg+xml",
]);

export const fetchImage = async (address: string): Promise<RemoteImage> => {
	let url = new URL(address);
	const signal = AbortSignal.timeout(15_000);
	for (let redirects = 0; redirects < 5; redirects += 1) {
		if (
			url.protocol !== "https:" ||
			url.username !== "" ||
			url.password !== ""
		) {
			throw new Error("Remote images must use HTTPS without credentials.");
		}
		const response = await fetch(url, { signal, redirect: "manual" });
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get("location");
			if (location === null) throw new Error("Image redirect has no location.");
			url = new URL(location, url);
			continue;
		}
		if (!response.ok || response.body === null) {
			throw new Error(`Image request failed: ${response.status}`);
		}
		const mime = response.headers.get("content-type")?.split(";")[0]?.trim();
		if (mime === undefined || !IMAGE_TYPES.has(mime.toLowerCase())) {
			throw new Error("The response is not a supported image.");
		}
		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let size = 0;
		try {
			for (;;) {
				const chunk = await reader.read();
				if (chunk.done) break;
				size += chunk.value.length;
				if (size > MAX_BYTES) throw new Error("The image is too large.");
				chunks.push(chunk.value);
			}
		} finally {
			await reader.cancel();
		}
		return {
			data: Buffer.concat(chunks).toString("base64"),
			mime: mime.toLowerCase(),
		};
	}
	throw new Error("Too many image redirects.");
};
