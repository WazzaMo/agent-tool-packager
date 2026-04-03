# Doc guide review feedback (todo)

## Context

Follow-up from a review of `docs/doc-guide.md` after recent edits. Items below are deferred improvements; apply as time allows.

## Fixes to make

1. **Grammar (release notes)** — In the Release Notes section, change “what new features was added” to “what new features were added” (or rephrase to singular: “what new feature was added”).

2. **Bug note filename vs general convention** — Align the bug write-up path with the general notes naming rule, or document what `-id` means. General pattern: `docs/notes/{YYYY-MM-DD}-{kind}-{meaningful-short-name}.md`. Bug line currently uses `{YYYY-MM-DD-id}-bug-{short-description}.md`, which introduces an extra `-id` that may confuse contributors.

3. **Table separator typo** — In the table example, remove the stray space before the closing pipe in the separator row (second column): `--------------------------------------------- |` → aligned bars.

4. **Flow between sections** — Between “Long Form text” and “Labelled line”, the fragment “... is better than” sits between two level-1 headings without a clear subject. Add a short bridge (e.g. “That pattern is better than:”) or fold the comparison into the “Long Form text” section.

## Optional polish

- **Stories path** — Clarify `{epic|story}` with a concrete example filename in `docs/stories/`.

- **Principle 4 (headings vs bold)** — Note that bold is fine in prose; the anti-pattern is using bold labels instead of structural headings (so principle 4 is not read as “never use bold”).

## What was already strong (no change required)

- Top-level `#` sections match stated principles.
- Purposeful Markdown structure (notes, release notes, features, stories, bugs) is clear.
- Cross-link to Feature 2 and reminder to keep package/part types aligned with canonical lists is valuable.
- Table guidance and examples are clear.
