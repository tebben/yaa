<script lang="ts">
import type {
	QuestionAnswer,
	QuestionField,
} from "@yaa/contracts/agent-events";
import { Button, TextField } from "@yaa/ui";
import {
	answerValues,
	type FieldValues,
	isChosen,
	toggleChoice,
} from "./question.ts";

// An agent question: its fields until it is answered, then the answer. What
// is filled in is the caller's to keep.
let {
	message,
	fields,
	answered,
	values,
	onset,
	onanswer,
}: {
	message: string;
	fields: readonly QuestionField[];
	answered: QuestionAnswer["action"] | undefined;
	values: FieldValues;
	onset: (name: string, value: FieldValues[string]) => void;
	onanswer: (answer: QuestionAnswer) => void;
} = $props();

const outcomes = {
	accept: "Answered",
	decline: "Declined",
	cancel: "Cancelled",
} as const;
</script>

<form
	class={{ waiting: answered === undefined }}
	onsubmit={(event) => {
		event.preventDefault();
		onanswer({ action: "accept", values: answerValues(fields, values) });
	}}
>
	<p>{message}</p>
	{#if answered === undefined}
		{#each fields as field (field.name)}
			<fieldset>
				<legend>{field.title}</legend>
				{#if field.kind === "choice"}
					<div class="choices">
						{#each field.choices as choice (choice.value)}
							<label>
								<input
									type={field.multiple ? "checkbox" : "radio"}
									name={field.name}
									checked={isChosen(values[field.name], choice.value)}
									onchange={() =>
										onset(
											field.name,
											toggleChoice(
												field.multiple,
												values[field.name],
												choice.value,
											),
										)}
								>
								{choice.label}
							</label>
						{/each}
					</div>
				{:else if field.kind === "boolean"}
					<input
						type="checkbox"
						aria-label={field.title}
						checked={values[field.name] === true}
						onchange={(event) => onset(field.name, event.currentTarget.checked)}
					>
				{:else}
					<TextField
						type={field.kind === "number" ? "number" : "text"}
						aria-label={field.title}
						value={String(values[field.name] ?? "")}
						oninput={(event) => onset(field.name, event.currentTarget.value)}
					/>
				{/if}
			</fieldset>
		{/each}
		<div class="choices">
			<Button type="submit">Answer</Button>
			<Button onclick={() => onanswer({ action: "decline" })}>Decline</Button>
		</div>
	{:else}
		<p class="outcome">{outcomes[answered]}</p>
	{/if}
</form>

<style>
input {
	accent-color: var(--color-accent);
}

form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-1_5);
	padding: var(--spacing-2) var(--spacing-2_5);
	border: 1px solid var(--color-border-strong);
	border-radius: var(--radius-control);
}

.waiting {
	border-color: var(--color-state-attention);
}

fieldset {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing-1);
}

fieldset > input {
	align-self: flex-start;
}

legend,
.outcome {
	color: var(--color-text-muted);
	font-size: var(--text-sm);
}

.choices {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-1_5);
}

label {
	display: flex;
	align-items: center;
	gap: var(--spacing-1);
	color: var(--color-text-soft);
}
</style>
