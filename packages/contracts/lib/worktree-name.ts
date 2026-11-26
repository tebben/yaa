// The per-project naming strategy (docs/spec/02-worktrees.md): what the
// user typed becomes a ticket id and a slug, and the template puts them
// together into the branch name; the folder is the branch with each / as -.
export type NamingRules = {
	// For example `{ticketId}-{slug}`.
	template: string;
	// Put before a bare number, so `123` becomes `PROJ-123`.
	ticketPrefix: string;
};

export type WorktreeName =
	| { branch: string; folder: string }
	| { problem: string };

const MAX_SLUG = 48;

// A ticket id at the start: a number, or a key, a dash and a number.
const leadingTicket = /^(?:([A-Za-z][A-Za-z0-9]*)-)?(\d+)(?=$|[\s:_-])/;

const slugOf = (text: string) => {
	const slug = text
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (slug.length <= MAX_SLUG) return slug;
	// Cut at the last whole word that fits.
	const cut = slug.slice(0, MAX_SLUG + 1);
	const end = cut.lastIndexOf("-");
	return end > 0 ? cut.slice(0, end) : slug.slice(0, MAX_SLUG);
};

// What git accepts as a branch name, narrowed to plain characters.
const validBranch = (name: string) =>
	/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name) &&
	!/\.\.|\/\/|\/\.|\.lock$|\.$|\/$/.test(name);

export const worktreeName = (
	text: string,
	{ template, ticketPrefix }: NamingRules,
): WorktreeName => {
	const typed = text.trim();
	const ticket = leadingTicket.exec(typed);
	const key = ticket?.[1];
	const ticketId =
		ticket === null
			? ""
			: key === undefined
				? `${ticketPrefix}${ticket[2]}`
				: `${key.toUpperCase()}-${ticket[2]}`;
	const slug = slugOf(ticket === null ? typed : typed.slice(ticket[0].length));
	if (ticketId === "" && slug === "") {
		return { problem: "Type a name or a ticket id" };
	}
	const branch = template
		.replaceAll("{ticketId}", ticketId)
		.replaceAll("{slug}", slug)
		// An empty part leaves its separators behind.
		.replace(/[-_.]*\/[-_.]*/g, "/")
		.replace(/([-_.])[-_.]+/g, "$1")
		.replace(/^[-_./]+|[-_./]+$/g, "");
	if (!validBranch(branch)) {
		return {
			problem: `“${branch}” is not a branch name git takes; check worktree.branchTemplate`,
		};
	}
	return { branch, folder: branch.replaceAll("/", "-") };
};
