import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import type { ContentBlock } from "@agentclientprotocol/sdk/unstable";
import type { AgentEvent, PromptAttachment } from "@yaa/contracts/agent-events";

type Sent = Extract<AgentEvent, { type: "prompt" }>["attachments"];

// A prompt as ACP's content blocks, and its attachments as the prompt event
// keeps them. Every agent takes text and links to files; images only when it
// says so.
export const promptContent = (
	text: string,
	attachments: readonly PromptAttachment[],
	{ images }: { images: boolean },
): { blocks: ContentBlock[]; sent: Sent } => {
	const blocks: ContentBlock[] = text === "" ? [] : [{ type: "text", text }];
	const sent: Sent = [];
	for (const attachment of attachments) {
		if (attachment.type === "file") {
			blocks.push({
				type: "resource_link",
				name: basename(attachment.path),
				uri: pathToFileURL(attachment.path).href,
			});
			sent.push(attachment);
		} else {
			if (!images) throw new Error("This agent takes no images");
			const { name, mimeType, data } = attachment;
			blocks.push({ type: "image", mimeType, data });
			sent.push({ type: "image", name });
		}
	}
	if (blocks.length === 0) throw new Error("The prompt is empty");
	return { blocks, sent };
};
