---
name: unslop
description: >
  Improve human-readable prose by cutting AI tells and making it concrete,
  direct and understandable. Use when drafting or editing documentation,
  READMEs, guides, release notes, issue text, commit bodies, final summaries, or
  other user-facing explanations.
---
# Unslop

## Scope

Edit human-readable prose while preserving its meaning and intended tone.

Apply to drafted or edited documentation, README text, guides, release notes,
issue descriptions, commit bodies and final summaries.

Do not apply these rules to code, identifiers, string literals, test fixtures,
quoted material, text the user asked to keep verbatim, or commit messages that
follow an established convention.

Match the established style of an existing file. A README already in title case
keeps its style. A Markdown file already using an established formatting pattern
keeps that pattern.

## Process

1. Scan the text for the patterns below.
2. Rewrite it. Preserve meaning and match the intended tone.
3. Prefer concrete details and direct explanations.
4. Audit the result for generic claims and remaining AI phrasing.

## Rules

Rule numbers are stable IDs. Keep these IDs when citing or updating a rule.

3. No trailing `-ing` phrases that add no fact. For example, delete
   "highlighting..." or "ensuring..." unless they describe real work.
5. No vague attributions. Name the source or delete the attribution.
7. No AI vocabulary: additionally, crucial, delve, enhance, foster, landscape,
   pivotal, showcase, testament, underscore, vibrant.
8. Say "is" or "has", not "serves as", "stands as", "boasts", or "features".
9. Do not use "not just X, but Y". State the point directly.
10. Do not force ideas into threes.
11. Use one name per thing. Repeat it instead of cycling through synonyms.
12. Do not use "from X to Y" unless X and Y sit on a real scale.
13. Do not use em dashes, en dashes, hyphens as dashes, or parentheses in their
   place. Use a period or comma.
14. Use a colon before a list or example, never as a mid-sentence connector.
15. Do not bold every proper noun or acronym.
16. Do not use a bold label and colon that restates its line. A bold lead-in that
   ends in a period and adds genuinely new detail is fine.
17. Use sentence case in headings.
18. Do not add decorative emojis.
19. Use straight quotes.
20. Remove chatbot phrases such as "I hope this helps!" and "Let me know if..."
22. Respond directly. Do not open with praise or agreement.
23. Cut filler. Change "in order to" to "to". Delete "it is important to note
   that".
24. Use at most one hedge. Prefer "may".
25. Replace generic conclusions with specific plans or facts.
26. Replace abstract metaphor nouns such as substrate, vector, nexus, primitive,
   harness, surface, scaffolding, paradigm, north star, and flywheel with
   concrete words.
27. Say what it does, not how it feels. Name the mechanism or number. Remove a
   sentence that could appear unchanged in another project's documentation.
28. Keep one idea in one sentence. Split a sentence the reader has to reread.
29. Use active voice. Name the actor unless it is unknown or does not matter.
30. Cut adverbs or use a stronger verb. Give a number where one is available.
31. Use the plain word: "use", not "utilize" or "leverage".
32. Use literal wording instead of metaphor, aphorism, personified code or
   figurative verbs.
33. Write complete sentences with their articles and verbs. Spell out arrows
   and abbreviations.
