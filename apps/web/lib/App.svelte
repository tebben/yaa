<script lang="ts">
import { keyParts } from "@yaa/commands/key-chord";
import { TooltipProvider } from "@yaa/ui";
import { Dock } from "@yaa/ui/dock";
import { setAgentChat } from "./agent/index.ts";
import { Palette } from "./palette/index.ts";
import { setPluginPanels } from "./plugins/index.ts";
import { ProjectMenu, ProjectOverview } from "./projects/index.ts";
import { Footer, Header, LeftMenu, Rail } from "./shell/index.ts";
import type { Workbench } from "./workbench.svelte.ts";

let { workbench }: { workbench: Workbench } = $props();
const { layout, regions, commands, palette, projects } = $derived(workbench);
setPluginPanels({ load: (kind) => workbench.plugins.panels.load(kind) });
setAgentChat(() => workbench.agentChat);

// The window is interactive once the dock is on screen: the launch time the
// smoke test measures (docs/spec/12-stack-packaging.md).
$effect(() => {
	if (layout.dock) performance.mark("yaa:interactive");
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
		class="grid h-screen grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)_auto]"
		data-focus-highlight={regions.highlighted || undefined}
	>
		{#if workbench.menuOpen}
			<LeftMenu region={regions.region("menu", "vertical")}>
				<ProjectMenu
					{projects}
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
		/>
		<main class="col-start-2 row-start-2 min-h-0 bg-grid p-panel-gap">
			{#if projects.selected && projects.view === "overview"}
				{@const { id } = projects.selected}
				<ProjectOverview
					project={projects.selected}
					onopenbranch={() => projects.select(id, "branch")}
				/>
			{:else if projects.view === undefined}
				<p class="p-3 text-text-muted">
					Add a project, or pick one in the left menu.
				</p>
			{/if}
			<!-- Kept while hidden, so panels keep their state. -->
			{#if layout.dock}
				<div class={["size-full", projects.view !== "branch" && "hidden"]}>
					<Dock dock={layout.dock} />
				</div>
			{/if}
		</main>
		<Footer
			status={projects.status}
			message={workbench.failure}
			region={regions.region("footer", "horizontal")}
		/>
		{#if projects.view === "branch"}
			<Rail
				kinds={layout.kinds}
				isOpen={(kind) => layout.dock?.isOpen(kind) ?? false}
				shortcut={(kind) => shortcut(`panel.toggle.${kind}`)}
				ontoggle={(kind) => commands.run(`panel.toggle.${kind}`)}
				region={regions.region("rail", "vertical")}
			/>
		{/if}
	</div>
	<Palette {palette} keysFor={commands.keysFor} />
</TooltipProvider>
