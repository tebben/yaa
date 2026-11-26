<script lang="ts">
import type {
	QuestionAnswer,
	QuestionField,
} from "@yaa/contracts/agent-events";
import { Button } from "@yaa/ui";
import {
	answerValues,
	type FieldValues,
	isChosen,
	toggleChoice,
} from "./question.ts";

// An agent question: its fields until it is answered, then the answer.
let {
	message,
	fields,
	answered,
	onanswer,
}: {
	message: string;
	fields: readonly QuestionField[];
	answered: QuestionAnswer["action"] | undefined;
	onanswer: (answer: QuestionAnswer) => void;
} = $props();

let values = $state<FieldValues>({});
</script>

<form
	class="flex flex-col gap-1.5 rounded-control border border-state-attention px-2 py-1.5"
	onsubmit={(event) => {
		event.preventDefault();
		onanswer({ action: "accept", values: answerValues(fields, values) });
	}}
>
	<p class="text-text">{message}</p>
	{#if answered === undefined}
		{#each fields as field (field.name)}
			<fieldset class="flex flex-col gap-1">
				<legend class="text-sm text-text-muted">{field.title}</legend>
				{#if field.kind === "choice"}
					<div class="flex flex-wrap gap-1.5">
						{#each field.choices as choice (choice.value)}
							<label class="flex items-center gap-1 text-text-soft">
								<input
									type={field.multiple ? "checkbox" : "radio"}
									name={field.name}
									checked={isChosen(values[field.name], choice.value)}
									onchange={() =>
										(values[field.name] = toggleChoice(
											field.multiple,
											values[field.name],
											choice.value,
										))}
								>
								{choice.label}
							</label>
						{/each}
					</div>
				{:else if field.kind === "boolean"}
					<input
						type="checkbox"
						class="self-start"
						bind:checked={
							() => values[field.name] === true,
							(checked) => (values[field.name] = checked)
						}
					>
				{:else}
					<input
						type={field.kind === "number" ? "number" : "text"}
						class="h-control rounded-control border border-border-input bg-raised px-2 text-text outline-focus focus-visible:outline-1"
						bind:value={
							() => String(values[field.name] ?? ""),
							(text) => (values[field.name] = text)
						}
					>
				{/if}
			</fieldset>
		{/each}
		<div class="flex gap-1.5">
			<Button type="submit">Answer</Button>
			<Button onclick={() => onanswer({ action: "decline" })}>Decline</Button>
		</div>
	{:else}
		<p class="text-text-muted">
			{answered === "accept" ? "Answered" : answered}
		</p>
	{/if}
</form>
