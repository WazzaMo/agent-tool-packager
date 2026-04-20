# Test summary: Feature 4 multi-type packages and follow-on cases

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

----------------------------------------------------------------------------

## Kind

test

## Scope

This note lists automated test cases that cover **Feature 4 (multi-type packages)** and **tests added after that work** (same release line: authoring UX, component sources, Prompt/Hook install paths, component basename uniqueness, **multi-agent Rule install from repo docs**). It is a map from **behaviour** to **test file** and **case title**, not a full inventory of the entire repo.

**Coverage:** All cases below are part of `npm test` (Vitest). The suite was passing at the time this note was written.

----------------------------------------------------------------------------

## Feature 4 — multi-type packages

### Integration (`test/integration/feature4-multi-type-packages.test.ts`)

- Default `atp create package` skeleton is **Multi** with empty `parts`.
- Legacy skeleton with `--legacy` leaves root `type` empty.
- End-to-end: **Skill + Mcp** parts, `part_N_Type/` layout in `stage.tar`, validate, catalog add, installed tree under Station.
- `newpart` on a legacy single-type package exits non-zero (must be Multi).
- Duplicate **part types**: validate succeeds; stderr warns.
- Part **bundle** add same path twice: idempotent (exit 0).
- Part **bundle** add with basename collision **across parts**: exit 2.
- `atp package part add <type>` aliases `newpart`.
- `part <n> add usage` appends; `part <n> usage` replaces.
- `part <n> component remove` updates manifest and `stage.tar`.
- `part <n> bundle remove` drops bundle from tar and manifest.
- `part <n> remove` reindexes `stage.tar` prefixes after deleting a middle part.

### Unit — skeleton (`test/package/create-skeleton.test.ts`)

- Default skeleton creates **Multi** `atp-package.yaml` with `parts: []` (Feature 4).
- Legacy option and reset behaviour (also used for Feature 2 flows).

### Unit — validation (`test/package/multi-type-validate.test.ts`)

- Multi with **no parts**: fails (exit 2).
- Multi with one **Skill** part, usage, component, and matching `part_1_Skill/...` in `stage.tar`: passes.
- **Same component basename in two parts**: fails (exit 1); staging checks skipped when this is detected.
- **Duplicate basename twice in one part’s** `components` list: fails (exit 1).
- Staged path **missing** for a declared part component: fails.

### Unit — bundle basename uniqueness (`test/package/part-bundle-uniqueness.test.ts`)

- No bundles → no collision.
- Same part, identical bundle path → not a collision (idempotent re-add).
- Another part already uses same bundle directory **basename** → collision.
- Same part, different path with same **basename** → collision.

### Unit — stage tar mutation (`test/package/stage-tar-mutate.test.ts`)

- Removes nested paths and rebuilds tar (used by part remove / bundle remove flows).

### Unit — catalog list type suffix (`test/catalog/package-type-summary.test.ts`)

- Multi manifest → bracket suffix from part types.
- Single root type, no parts → root type only.
- Missing type → empty suffix.

### Integration — catalog CLI (`test/integration/catalog.test.ts`)

- `catalog list --verbose` loads per-package `atp-package.yaml` for type display (Multi-aware).
- Invalid package YAML under verbose path → exit 2.

----------------------------------------------------------------------------

## After Feature 4 — component source paths (cp-like)

Behaviour: component sources may be **relative to package cwd** (including `../`) or **absolute**; manifest and tar still use **basenames** (and `part_N_Type/` for Multi).

### Unit (`test/package/resolve-component-source.test.ts`)

- Relative from package cwd; parent-relative (`../`); absolute normalisation.

### Unit (`test/package/component-add.test.ts`)

- Adds from `../…` outside package tree; adds from **absolute** path.

### Integration (`test/integration/package-developer-feature2.test.ts`)

- CLI `atp package component add` with source **outside** package directory (`../`): manifest and `stage.tar` updated.

----------------------------------------------------------------------------

## After Feature 4 — Prompt / Hook install mapping

### Unit (`test/install/copy-assets.test.ts`)

- **Prompt** assets copy to `prompts/`.
- **Hook** assets: `hooks.json` at agent root; other files under `hooks/`.
- `agentDestinationForAsset` expectations for Hook layout.

----------------------------------------------------------------------------

## After Feature 4 — component basename uniqueness (package-wide)

Behaviour: **Multi** `atp package part <n> component` rejects a basename already used on the same part or on any other part (exit 1). `validate package` rejects duplicate basenames in the manifest (exit 1) and skips staging checks when duplicates are present.

### Unit (`test/package/part-component-uniqueness.test.ts`)

- `componentBasenameCollisionForPartAdd`: same-part, other-part, no collision, empty part.

### Integration (`test/integration/package-authoring-prompt-workflow.test.ts`)

- Full authoring: Multi skeleton, metadata, **Prompt** part with real `docs/doc-guide.md` and `docs/clean-code.md`, validate, summary.
- Second add of **same** `doc-guide.md` to **same** part → exit 1.
- Add **same** `doc-guide.md` to a **second** part → exit 1.

----------------------------------------------------------------------------

## After Feature 4 — Rule package from repo docs, multi-agent Safehouse install

End-to-end **legacy Rule** workflow: absolute paths to real repository files, Station catalog, then **project** install into separate mock projects per agent.

### Integration (`test/integration/install-rule-docs-multi-agent.test.ts`)

- Builds a **Rule** package from `docs/doc-guide.md` and `docs/clean-code.md` (absolute `component add` paths), `catalog add package` into the temp Station (`user_packages/...` + `package.tar.gz`).
- For each of **cursor**, **gemini**, **kiro**, and **claude**: new project with `.git` marker, `safehouse init`, `agent <name>`, `install repo-docs-rules --project`.
- Asserts both files appear under that agent’s project rules directory (e.g. `.cursor/rules/`, `.gemini/rules/`, `.kiro/rules/`, `.claude/rules/`) with **content equal** to the source files in the repo.

----------------------------------------------------------------------------

## Related tests not exclusive to Feature 4

These predate or parallel Feature 4 but often run in the same workflows:

- **Feature 2** integration and workflow tests (`package-developer-feature2.test.ts`, `package-developer-workflow.test.ts`): legacy single-type packages, catalog add, bundles, etc.
- **Feature 3** install / safehouse tests (`feature3-package-install-process.test.ts`, `install.test.ts`, `remove.test.ts`).
- **General** `validate.test.ts`, `component-remove.test.ts`, `bundle-add/remove.test.ts`, config/load tests.

----------------------------------------------------------------------------

## Maintenance

When adding Multi-type behaviour, extend **feature4** integration tests and/or **multi-type-validate** / **part-*** unit tests, and update this note if the new cases are part of the “Feature 4 and after” story. When changing default **agent-paths** or Rule install layout, revisit **install-rule-docs-multi-agent** and this section.
