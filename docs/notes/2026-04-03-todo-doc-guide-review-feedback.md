# Doc guide review feedback (completed)

## Context

Follow-up from a review of `docs/doc-guide.md` after recent edits. Items below were applied in `docs/doc-guide.md` (see git history around 2026-04-04).

## Resolutions

1. **Grammar (release notes)** — Fixed earlier: “what new features **were** added”.

2. **Bug note filename vs general convention** — Bugs use `docs/bugs/{YYYY-MM-DD}-bug-{bug-id:DDDDD}-{short-description}.md` with `bug-id` explained; wording no longer refers to note “kinds” for bugs.

3. **Table separator typo** — Stray space before the closing pipe in the example separator row removed.

4. **Flow between sections** — Bridge sentence “That pattern is better than:” added between “Long Form text” and “Labelled line”.

5. **Stories path (optional)** — Concrete examples added after the `{epic|story}-…` template.

6. **Principle 4 (optional)** — Principle 4 now states bold is fine in prose; the anti-pattern is bold used as pseudo-headings for labels.

## What was already strong (unchanged)

- Top-level `#` sections match stated principles.
- Purposeful Markdown structure (notes, release notes, features, stories, bugs) is clear.
- Cross-link to Feature 2 and reminder to keep package/part types aligned with canonical lists is valuable.
- Table guidance and examples are clear.
