// A file of the worktree, as the editor opens it.
type Reference = { path: string; line?: number };

// A path under the worktree's folder as one relative to it; a relative path
// stays. Undefined for one that leaves the folder.
export const worktreeFile = (
	path: string,
	root: string,
): string | undefined => {
	const relative = path.startsWith(`${root}/`)
		? path.slice(root.length + 1)
		: path.replace(/^\.\//, "");
	return relative === "" ||
		relative.startsWith("/") ||
		relative.split("/").includes("..")
		? undefined
		: relative;
};

// `path`, `path:line`, `path:line:column` or `path#Lline`.
const LINE = /(?::(\d+)(?::\d+)?|#L(\d+)(?:-L?\d+)?)$/;

const reference = (text: string, root: string): Reference | undefined => {
	const match = LINE.exec(text);
	const line = match?.[1] ?? match?.[2];
	const path = worktreeFile(
		match === null ? text : text.slice(0, match.index),
		root,
	);
	if (path === undefined) return undefined;
	return line === undefined ? { path } : { path, line: Number(line) };
};

const decode = (text: string) => {
	try {
		return decodeURI(text);
	} catch {
		// Not percent-encoded after all.
		return text;
	}
};

// The file a markdown link points to, when it is one in the worktree.
export const linkedFile = (
	href: string,
	root: string,
): Reference | undefined => {
	const target = decode(href.replace(/^file:\/\//, ""));
	return /^(?:[a-z][a-z0-9+.-]+:(?!\d)|#)/i.test(target)
		? undefined
		: reference(target, root);
};

// The file that text such as a code span names: a path with an extension, in
// a folder or at a line, so that a name like `a.b` is left alone.
export const mentionedFile = (
	text: string,
	root: string,
): Reference | undefined => {
	if (/\s|:\/\//.test(text)) return undefined;
	const found = reference(text, root);
	if (found === undefined || !/[^/]\.[A-Za-z0-9]+$/.test(found.path)) {
		return undefined;
	}
	return found.path.includes("/") || found.line !== undefined
		? found
		: undefined;
};

// A tool call's title around the path it names, to make the path a link.
export const splitTitle = (
	title: string,
	path: string,
): [before: string, after: string] | undefined => {
	const at = title.indexOf(path);
	return at < 0
		? undefined
		: [title.slice(0, at), title.slice(at + path.length)];
};
