<script lang="ts">
import { TooltipProvider } from "@yaa/ui";
import { Dock } from "@yaa/ui/dock";
import type { LayoutController } from "./layout.svelte.ts";
import { panelKinds } from "./panels/index.ts";
import { Footer, Header, LeftMenu, Rail } from "./shell/index.ts";

let { layout }: { layout: LayoutController } = $props();
</script>

<TooltipProvider>
	<div
		class="grid h-screen grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)_auto]"
	>
		<LeftMenu />
		<Header />
		<main class="min-h-0 bg-surface">
			{#if layout.dock}
				<Dock dock={layout.dock} />
			{/if}
		</main>
		<Footer error={layout.error} />
		<Rail
			kinds={panelKinds}
			isOpen={(kind) => layout.dock?.isOpen(kind) ?? false}
			ontoggle={(kind) => layout.dock?.toggle(kind)}
		/>
	</div>
</TooltipProvider>
