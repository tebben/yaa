<script lang="ts">
import { formatKey } from "@yaa/commands/key-chord";
import { TooltipProvider } from "@yaa/ui";
import { Dock } from "@yaa/ui/dock";
import { Palette } from "./palette/index.ts";
import { panelKinds } from "./panels/index.ts";
import { Footer, Header, LeftMenu, Rail } from "./shell/index.ts";
import type { Workbench } from "./workbench.svelte.ts";

let { workbench }: { workbench: Workbench } = $props();
const { layout, regions, commands, palette } = $derived(workbench);

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
			<LeftMenu region={regions.region("menu", "vertical")} />
		{/if}
		<Header region={regions.region("header", "horizontal")} />
		<main class="col-start-2 min-h-0 bg-surface">
			{#if layout.dock}
				<Dock dock={layout.dock} />
			{/if}
		</main>
		<Footer
			error={layout.error}
			region={regions.region("footer", "horizontal")}
		/>
		<Rail
			kinds={panelKinds}
			isOpen={(kind) => layout.dock?.isOpen(kind) ?? false}
			shortcut={(kind) => shortcut(`panel.toggle.${kind}`)}
			ontoggle={(kind) => commands.run(`panel.toggle.${kind}`)}
			region={regions.region("rail", "vertical")}
		/>
	</div>
	<Palette {palette} keysFor={commands.keysFor} />
</TooltipProvider>
