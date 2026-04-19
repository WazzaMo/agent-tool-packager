# Test note: duplicate part type warnings removal

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Purpose

This note records **integration test changes** for removing stderr warnings when a Multi package
reuses the same part `type` on more than one part (e.g. two Rule parts). It complements the
[coding note for the same date](./2026-04-19-coding-note-duplicate-part-type-warnings-removal.md).

## Updated tests

| File | What changed |
|------|--------------|
| `test/integration/feature4-multi-type-packages.test.ts` | Case **duplicate part types** renamed to reflect **no** duplicate-type stderr; still builds two Rule parts and expects `atp validate package` exit **0**; asserts `stderr` does **not** match `/duplicate part types/` (previous behaviour expected a warning line). |

## Commands used

- Targeted: `npm run test:run -- --testPathPattern=feature4-multi-type-packages`
- Broader: `npm run test:run` before merge.

## Related product docs

- [Feature 4 — Multi-type packages](../features/4-multi-type-packages.md) (authoring table and `atp validate package` acceptance).
- [Configuration](../configuration.md) (Part layout: repeated `type` across parts).
