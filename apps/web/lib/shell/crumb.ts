import type { IconSource } from "@yaa/ui";

// A step of the header's path: the project, then its overview or branch.
export type Crumb = { icon: IconSource; label: string; mono?: boolean };
