# Coding note: Codex hooks TOML, recursive tree copy, journal refactor

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Purpose

This note records **implementation work** completed for matrix **3.10**, **6.1** (directory branch), **9.1**, and a follow-up **lint-driven refactor**. Pair with the [test note for the same date](./2026-04-11-test-note-codex-hooks-journal-tree-copy.md).

## Matrix 3.10 — Codex `[features].codex_hooks`

- `mergeCodexConfigTomlEnableCodexHooks` in `src/file-ops/mcp-merge/mcp-codex-toml-merge.ts` ensures hooks installs can rely on Codex reading `hooks.json`; explicit `codex_hooks = false` raises `CodexHooksFeatureConflictError` unless `--force-config` (with `console.warn` when forced).
- `CodexAgentProvider` orders plan actions: **`codex_config_toml_hooks_feature_merge`** before **`hooks_json_merge`** and **`interpolation_policy`**.
- Apply path: `applyCodexConfigTomlHooksFeatureMergeAction` in `src/provider/apply-provider-plan-merge.ts`; dispatch in `apply-provider-plan.ts` / `apply-provider-plan-actions.ts`.
- User-facing errors: `src/install/format-install-user-failure.ts` formats `CodexHooksFeatureConflictError` like other merge hints (optional verbose JSON).

## Matrix 6.1 — Recursive directory `raw_file_copy`

- `RawFileCopyAction.recursiveDirectorySource` in `src/provider/provider-dtos.ts`; `copyDirectoryRecursive` + branch in `applyRawFileCopyAction` (`src/provider/apply-provider-plan-base.ts`).
- Hook script staging paths set the flag from `fs.statSync` when the source is a directory (Cursor, Codex, Claude, Gemini providers); non-primary skill assets in `src/provider/skill/plan-skill-install.ts`.

## Matrix 9.1 — Non-goals documentation

- New note: [2026-04-11-atp-non-goals-deferred-layers.md](./2026-04-11-atp-non-goals-deferred-layers.md).
- [2026-04-03-plan-provider-capability-matrix.md](./2026-04-03-plan-provider-capability-matrix.md) updated for **3.10**, **6.1**, **9.1**, Codex hook summary text, and **Still open**.

## Config journal — `codex_features` and complexity

- `ConfigMergeJournalEntryV1.kind` includes `"codex_features"`; fragments union includes `{ type: "codex_features"; codex_hooks_before: boolean | null }`.
- Drift rollback uses `applyCodexHooksFeatureRollbackToRoot` (`mcp-codex-toml-merge.ts`).
- `rollbackMergedConfigJournal` was split into helpers (`journalConfigRootBase`, `loadJournalRollbackCurrentState`, `tryExactJournalRollback`, `applyDriftFragmentRollback`, plus small MCP/hooks/Codex fragment writers) so ESLint complexity stays under the project limit without changing rollback semantics.

## Commits (reference)

Landings were grouped as feature work plus a dedicated refactor commit for the journal function (see `git log` on branch `wm/feature4-multitype` around **2026-04-11**).
