<script lang="ts">
import { formatKey } from "@yaa/commands/key-chord";
import { TooltipProvider } from "@yaa/ui";
import { Dock } from "@yaa/ui/dock";
import { setAgentChat } from "./agent/index.ts";
import { Palette } from "./palette/index.ts";
import { setPluginPanels } from "./plugins/index.ts";
import { Footer, Header, LeftMenu, Rail } from "./shell/index.ts";
import type { Workbench } from "./workbench.svelte.ts";

let { workbench }: { workbench: Workbench } = $props();
const { layout, regions, commands, palette } = $derived(workbench);
setPluginPanels({ load: (kind) => workbench.plugins.panels.load(kind) });
setAgentChat(() => workbench.agentChat);

// The window is interactive once the dock is on screen: the launch time the
// smoke test measures (docs/spec/12-stack-packaging.md).
$effect(() => {
	if (layout.dock) performance.mark("yaa:interactive");
});

const shortcut = (id: string) => {
	const [key] = commands.keysFor(id);
	return key === undefined ? undefined : formatKey(key);
};
</script>

<svelte:window onkeydowncapture={commands.handleKey} />

<TooltipProvider>
	<div
		class="grid h-screen grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)_auto]"
	>
		{#if workbench.menuOpen}
			<LeftMenu
				region={regions.region("menu", "vertical")}
				shortcut={shortcut("menu.toggle")}
				onhide={() => commands.run("menu.toggle")}
			/>
		{/if}
		<Header
			region={regions.region("header", "horizontal")}
			menuOpen={workbench.menuOpen}
			menuShortcut={shortcut("menu.toggle")}
			onshowmenu={() => commands.run("menu.toggle")}
		/>
		<main class="col-start-2 min-h-0 bg-surface">
			{#if layout.dock}
				<Dock dock={layout.dock} />
			{/if}
		</main>
		<Footer
			message={workbench.failure}
			region={regions.region("footer", "horizontal")}
		/>
		<Rail
			kinds={layout.kinds}
			isOpen={(kind) => layout.dock?.isOpen(kind) ?? false}
			shortcut={(kind) => shortcut(`panel.toggle.${kind}`)}
			ontoggle={(kind) => commands.run(`panel.toggle.${kind}`)}
			region={regions.region("rail", "vertical")}
		/>
	</div>
	<Palette {palette} keysFor={commands.keysFor} />
</TooltipProvider>
