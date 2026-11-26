<script lang="ts">
import { keyParts } from "@yaa/commands/key-chord";
import { TooltipProvider } from "@yaa/ui";
import { Palette } from "./palette/index.ts";
import { setPluginPanels } from "./plugins/index.ts";
import { ProjectMenu, ProjectOverview } from "./projects/index.ts";
import { Footer, Header, LeftMenu, PanelBar } from "./shell/index.ts";
import WorktreeDock from "./WorktreeDock.svelte";
import type { Workbench } from "./workbench.svelte.ts";

let { workbench }: { workbench: Workbench } = $props();
const { layouts, regions, commands, palette, projects, worktrees } =
	$derived(workbench);
setPluginPanels({
	mount: (kind, worktree, frame) =>
		workbench.plugins.panels.mount(kind, worktree, frame),
});

// The window is interactive once a dock is on screen: the launch time the
// smoke test measures (docs/spec/12-stack-packaging.md).
$effect(() => {
	if (workbench.dock) performance.mark("yaa:interactive");
});

const shortcut = (id: string) => {
	const [key] = commands.keysFor(id);
	return key === undefined ? undefined : keyParts(key);
};
</script>

<!-- A click hides the focus edge until a key moves focus again. -->
<svelte:window
	onkeydowncapture={commands.handleKey}
	onpointerdowncapture={regions.hideHighlight}
/>

<TooltipProvider>
	<div
		class="grid h-screen grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto]"
		data-focus-highlight={regions.highlighted || undefined}
	>
		{#if workbench.menuOpen}
			<LeftMenu region={regions.region("menu", "vertical")}>
				<ProjectMenu
					{projects}
					{worktrees}
					addShortcut={shortcut("project.add")}
					searchShortcut={shortcut("menu.search")}
				/>
			</LeftMenu>
		{/if}
		<Header
			region={regions.region("header", "horizontal")}
			menuOpen={workbench.menuOpen}
			menuShortcut={shortcut("menu.toggle")}
			ontogglemenu={() => commands.run("menu.toggle")}
			crumbs={projects.crumbs}
		>
			{#snippet end()}
				{#if projects.view === "worktree"}
					<PanelBar
						kinds={layouts.kinds}
						isOpen={(kind) => workbench.dock?.isOpen(kind) ?? false}
						shortcut={(kind) => shortcut(`panel.toggle.${kind}`)}
						ontoggle={(kind) => commands.run(`panel.toggle.${kind}`)}
						onpeek={(kind) => workbench.dock?.peek(kind)}
					/>
				{/if}
			{/snippet}
		</Header>
		<main class="col-start-2 row-start-2 min-h-0 bg-grid p-panel-gap">
			{#if projects.selected && projects.view === "overview"}
				{@const project = projects.selected}
				<ProjectOverview
					{project}
					onopenbranch={(worktree) =>
						projects.go({ project: project.id, worktree })}
				/>
			{:else if projects.view === undefined}
				<p class="p-3 text-text-muted">
					Add a project, or pick one in the left menu.
				</p>
			{/if}
			<!-- Every opened worktree keeps its dock while hidden, so its panels
			     keep their state. -->
			{#each layouts.docks as [id, dock] (id)}
				<div class={["size-full", projects.worktree?.id !== id && "hidden"]}>
					<WorktreeDock worktree={id} {dock} />
				</div>
			{/each}
		</main>
		<Footer
			status={projects.status}
			state={projects.worktree && projects.stateOf(projects.worktree.id)}
			message={workbench.failure}
			region={regions.region("footer", "horizontal")}
		/>
	</div>
	<Palette {palette} />
</TooltipProvider>
