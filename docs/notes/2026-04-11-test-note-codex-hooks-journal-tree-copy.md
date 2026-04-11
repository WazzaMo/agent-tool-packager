# Test note: Codex hooks feature merge, journal `codex_features`, recursive `raw_file_copy`

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Purpose

This note records **automated tests added or extended** for provider capability matrix items **3.10** (Codex `[features].codex_hooks`), **6.1** (recursive directory tree copy for op **3**), and related install failure formatting. It complements the [coding note for the same date](./2026-04-11-coding-note-codex-hooks-recursive-copy-journal-refactor.md).

## New or materially extended tests

| File | What it covers |
|------|----------------|
| `test/file-ops/mcp-codex-toml-merge.test.ts` | `mergeCodexConfigTomlEnableCodexHooks`: add flag when absent, noop when already `true`, throws `CodexHooksFeatureConflictError` when `false` without `forceConfig`, flips `false` → `true` with `forceConfig`. |
| `test/provider/codex-agent-provider.test.ts` | Hook install plan order: `codex_config_toml_hooks_feature_merge` → `hooks_json_merge` → `interpolation_policy`; `config.toml` gains `codex_hooks`; install throws when user set `codex_hooks = false` without `--force-config`. |
| `test/config/config-merge-journal.test.ts` | Journal **exact** rollback deletes `config.toml` when hooks feature was added to a previously absent file; **drift** path warns and fragment-rollback strips `codex_hooks` while preserving unrelated keys. |
| `test/install/format-install-user-failure.test.ts` | `CodexHooksFeatureConflictError`: stderr lines include hint; verbose mode adds stable JSON (`code`, `mergeTargetLabel`). |
| `test/provider/apply-raw-file-copy.test.ts` | `applyRawFileCopyAction`: directory source without `recursiveDirectorySource` throws; with flag, nested files copy under the layer destination. |

## Commands used while landing the work

- Targeted: `npx vitest run test/config/config-merge-journal.test.ts` (after `rollbackMergedConfigJournal` refactor).
- Broader: `npm run test:run -- --project unit` (full unit project).
- Full verification before merge-ready state: `npm run build`, `npm run lint`, `npm run test:run` (unit + integration).

## Related product notes

- [Non-goals / deferred layers](./2026-04-11-atp-non-goals-deferred-layers.md) (matrix **9.1**).
- [Provider capability matrix](./2026-04-03-plan-provider-capability-matrix.md) (items **3.10**, **6.1**, **9.1** marked done in-repo).
