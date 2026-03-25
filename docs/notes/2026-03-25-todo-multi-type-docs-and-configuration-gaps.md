# Multi-type packages: doc and configuration gaps

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Kind: todo · date: 2026-03-25

Review of [configuration.md](../configuration.md), [features/4-multi-type-packages.md](../features/4-multi-type-packages.md), and [doc-guide.md](../doc-guide.md). configuration.md now spells out **Type = `Multi`** versus **Type != `Multi`** behaviour, validation severity, and how legacy single-type rules apply.

# Newly documented in configuration.md

| Topic                         | Detail         |
|-------------------------------|----------------|
| Multi vs legacy in one file | See (1) below  |
| `parts` when Type is Multi    | See (2) below  |
| Root fields by mode         | See (3) below  |
| Validation and exit codes   | See (4) below  |

(1) **Type = `Multi`:** root-level Type defaults to `Multi` (multi-type file); it may be set to `Rule` in a legacy package (sentence as written—confirm intent with implementation). **Type != `Multi`:** when Type is a valid value from Feature 2, the effective rules match the **legacy** package layout.

(2) For Type = `Multi`, `parts` is **required in practice**: missing `parts` must produce an error message, **fatal**, non-zero exit. The field table still lists `parts` as **optional**; that is a **doc inconsistency** until the table reflects conditional rules (optional in YAML vs required when Type is Multi).

(3) For Type = `Multi`, root `components`, `bundles`, and `Usage` **do not need** to be present (values live under parts). For Type != `Multi`, root `components`, `bundles`, and `Usage` are **expected**; an incomplete single-type manifest must fail validation with non-zero exit.

(4) Missing required `parts` (Multi) and invalid/incomplete legacy layout (non-Multi) are both specified as errors with non-zero exit. Duplicate `Part.type` values remain a **warning** only (unchanged from prior review).

# Resolved or superseded (no longer tracked here)

| Topic                        | Detail                                                      |
|------------------------------|-------------------------------------------------------------|
| Stale configuration pointer  | Feature 4 names **Extended atp-package.yaml layout (version 0.2.3+)**. |
| Duplicate 0.2.3+ spec       | Feature 4 defers the modern layout to configuration.md.    |
| Multi-type example YAML     | Example in configuration.md is readable.                        |
| `part.type` vocabulary      | Feature 2 **Package Types** remains the source list.          |
| Duplicate types across parts | Warning, not fatal.                                           |

# Minor polish (optional)

| Item            | Detail         |
|-----------------|----------------|
| Plain link      | See (5) below  |
| Heading style   | See (6) below  |
| Version wording | See (7) below  |

(5) Feature 4 still ends with plain “refer to configuration.md”; a markdown link would match the rest of the doc.

(6) Feature 4 mixes `#` and `##` after the title. Optional cleanup per doc-guide.

(7) The heading `version => 0.2.3` could use a consistent comparator style (for example **≥ 0.2.3**).

# Remaining gaps and consistency checks

| Topic              | Detail         |
|--------------------|----------------|
| Table vs prose     | See (8) below  |
| `Multi` casing     | See (9) below  |
| Multi + root fields | See (10) below |
| Default / legacy   | See (11) below |

(8) Root field table lists `parts` as **optional** while the **Type = `Multi`** subsection requires `parts` with fatal error if missing. Update the table or add a footnote that **mandatory/optional depends on `Type`**.

(9) Prose uses **`Multi`**; the YAML example uses `type: multi`. Align documentation and schema (case sensitivity) with the parser.

(10) If **Type = `Multi`** and root-level `components`, `bundles`, or `Usage` are **also** present, behaviour is not stated (ignore, merge, or reject). Worth one sentence for implementers.

(11) The line about defaulting to `Multi` while allowing `Rule` for a legacy package is easy to misread. A short clarifying example (two valid shapes) would reduce support questions.

# Narrower open items

### Migration narrative

Authors moving from mandatory root `usage` (0.2.2) to per-part `usage` under Type = `Multi` may still benefit from a short mapping in feature 4 or Feature 2.

### ATP semver vs package manifest vs `atp-config` schema

Feature 4 describes ATP 0.2.3 / 0.3.0; configuration.md shows `configuration.version` under `atp-config.yaml`. A one-line reminder that these version streams differ can still help.

### 0.3.0 "by default"

Which commands or templates emit Type = `Multi` manifests by default remains to be named when that release is fixed.

# Smaller consistency notes

| Note          | Detail         |
|---------------|----------------|
| Type spelling | See (12) below |

(12) Examples use `Mcp` and `Skill`. Keep CONTRIBUTING, schema, and code aligned with canonical casing.

# Suggested follow-ups

1. Reconcile the root field table (`parts` optional vs required when Type is `Multi`) with the **Type = `Multi`** / **Type != `Multi`** subsections.

2. Document `multi` vs `Multi` and any default when `type` is omitted.

3. Add one sentence on Multi manifests that also set root `components` / `bundles` / `Usage`.

4. Clarify “default to `Multi`” and “set to `Rule` in a legacy package” with a minimal example.

5. Optional: markdown link at the end of feature 4; migration bullets; ATP vs config vs manifest one-liner; 0.3.0 defaults when scoped.

6. Close or archive this todo when the above are implemented or moved to a plan note.
