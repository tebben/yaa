// A tab as the tab strip shows it.
export type Tab = {
	id: string;
	name: string;
	// Shown after the name, such as the folder that tells two files apart.
	detail?: string | undefined;
	// The tooltip.
	title: string;
	active: boolean;
	// A tab that is not there to stay.
	italic?: boolean;
	// A tab of something that is gone.
	struck?: boolean;
	// A dot where the close button is, and what it means, such as `unsaved`.
	dot?: string | undefined;
};
