# Coding note: duplicate part type warnings removal

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Purpose

This note records **implementation and spec updates** that stop treating repeated part `type`
values in a Multi manifest as something to warn about. Pair with the
[test note for the same date](./2026-04-19-test-note-duplicate-part-type-warnings-removal.md).

## Code

- `src/package/validate-multi-type-package.ts` — Removed `hasDuplicatePartTypes` and the
  `console.warn` branch on successful Multi validation (duplicate types are ordinary success).
- `src/package/validate-catalog-install-package.ts` — Dropped the parallel install-time warning
  for the same condition so catalog extract validation matches authoring validation.
- `src/package/part-authoring/newpart.ts` — Removed stderr when appending a part whose `type`
  matches an existing part; `atp package newpart` still appends and prints the usual success line.

## Documentation

- `docs/features/4-multi-type-packages.md` — Error scenario row: duplicate part types → valid,
  no extra stderr; removed validate acceptance bullet that required warnings; test approach updated.
- `docs/configuration.md` — Part layout text now describes repeated `type` as valid Multi layout
  without prescribing a warning.

## Rationale

Authors may legitimately split content across multiple parts of the same kind; stderr noise for
that shape was not actionable and cluttered validation output.
