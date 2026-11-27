<script lang="ts">
import type { LogRecord } from "@yaa/contracts/log";
import { dataOf, timeOf } from "./log-line.ts";

// One log line: when, how severe, from where, and what.
let { record }: { record: LogRecord } = $props();
</script>

<div class={["line", record.level]}>
	<span class="time">{timeOf(record)}</span>
	<span class="level">{record.level}</span>
	<span class="source">{record.source}</span>
	<span class="message">
		{record.message}
		{#if record.data}
			<span class="data">{dataOf(record)}</span>
		{/if}
	</span>
</div>

<style>
.line {
	display: flex;
	gap: var(--spacing-2);
	padding: 0 var(--spacing-3);
	font-family: var(--font-mono);
	font-size: var(--text-xs);
	line-height: 1.6;
	color: var(--color-text-soft);
	user-select: text;
}

.time,
.level,
.source {
	flex: none;
	color: var(--color-text-muted);
}

.level {
	width: 5ch;
}

.source {
	width: 11ch;
}

.message {
	min-width: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.data {
	color: var(--color-text-muted);
}

.debug .message {
	color: var(--color-text-muted);
}

.warn .level,
.warn .message {
	color: var(--color-state-attention);
}

.error .level,
.error .message {
	color: var(--color-state-error);
}
</style>
