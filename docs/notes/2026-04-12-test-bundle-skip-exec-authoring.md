# Test note: bundle `--skip-exec` authoring (Multi and legacy)

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

test

## Purpose

This note lists automated tests for the **`--skip-exec`** bundle option: data-only bundle
trees (no `bin/`, no executable glob) when authoring packages. It pairs with the
[coding note for the same change](./2026-04-12-coding-bundle-skip-exec-authoring.md).

## Behaviour under test

- Multi: `atp package part <n> bundle add <dir> --skip-exec` writes **`skip-exec: true`**
  on the bundle row in **`atp-package.yaml`** and omits **`exec-filter`**.

- Combining **`--skip-exec`** with **`--exec-filter`** must exit non-zero with a clear
  message.

- Legacy root: **`bundleAdd`** accepts **`skipExec`** in code; unit tests cover manifest
  shape and the same mutual exclusion rule as the CLI.

## Tests

| File | What it covers |
|------|----------------|
| `test/integration/feature4-multi-type-packages.test.ts` | Multi Mcp part: directory without **`bin/`**, **`bundle add … --skip-exec`**, manifest contains **`skip-exec: true`**, **`validate package`** exits **0**; second case rejects both flags. |
| `test/package/bundle-add.test.ts` | Legacy **`bundleAdd`**: data-only bundle with **`skipExec: true`**; throws when **`skipExec`** and **`execFilter`** are both set. |

## Commands used

- Targeted: `npm run test:run -- test/package/bundle-add.test.ts`

- Targeted: `npm run test:run -- test/integration/feature4-multi-type-packages.test.ts`

- Full gate: **`npm run ci:test`** (build plus full Vitest), since integration tests run
  **`dist/atp.js`**.

## Related

- [Coding note](./2026-04-12-coding-bundle-skip-exec-authoring.md)
