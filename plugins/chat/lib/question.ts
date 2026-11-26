import type {
	QuestionAnswer,
	QuestionField,
} from "@yaa/contracts/agent-events";

// What the question form holds per field: typed text (numbers too, until
// they are sent), a yes or no, and the chosen values of a choice.
export type FieldValues = Record<string, string | boolean | string[]>;

type Values = Extract<QuestionAnswer, { action: "accept" }>["values"];

const chosen = (value: FieldValues[string] | undefined): string[] =>
	Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

export const isChosen = (
	value: FieldValues[string] | undefined,
	choice: string,
): boolean => chosen(value).includes(choice);

// Picks a choice; in a multiple choice, picking a chosen one unpicks it.
export const toggleChoice = (
	multiple: boolean,
	value: FieldValues[string] | undefined,
	choice: string,
): string | string[] => {
	if (!multiple) return choice;
	const current = chosen(value);
	return current.includes(choice)
		? current.filter((item) => item !== choice)
		: [...current, choice];
};

// The values to send: empty fields left out, numbers as numbers.
export const answerValues = (
	fields: readonly QuestionField[],
	values: FieldValues,
): Values => {
	const answer: Values = {};
	for (const field of fields) {
		const value = values[field.name];
		if (value === undefined || value === "") continue;
		if (field.kind === "number") {
			const number = Number(value);
			if (!Number.isNaN(number)) answer[field.name] = number;
		} else if (field.kind === "choice" && field.multiple) {
			answer[field.name] = chosen(value);
		} else answer[field.name] = value;
	}
	return answer;
};
