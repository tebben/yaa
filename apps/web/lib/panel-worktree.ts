import { createContext } from "svelte";

// The worktree whose dock a panel is in. A getter, as props are read in
// closures.
export const [getPanelWorktree, setPanelWorktree] =
	createContext<() => string>();
