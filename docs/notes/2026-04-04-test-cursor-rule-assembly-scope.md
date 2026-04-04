# Test: Cursor rule assembly scope

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Scope

This note records test coverage for the Cursor `.mdc` rule assembly prototype (`src/provider/rule-assembly/`). Product behaviour is summarised in [2026-04-04-coding-rule-assembly-and-package-refactor](./2026-04-04-coding-rule-assembly-and-package-refactor.md).

# Unit tests

### Location

`test/provider/cursor-mdc-assembly.test.ts`

### Target

`normalizeCursorFrontmatterYaml`, `normalizeRuleBodyMarkdown`, `assembleCursorMdcContent`, and `RuleAssemblyInvalidInputError`.

| Area           | Asserts (short)              |
|----------------|------------------------------|
| Frontmatter    | Trim; strip `---` wrapper    |
| Body           | BOM + CRLF handling          |
| Golden match   | Same bytes as fixture file   |
| Wrapped input  | YAML with markers still OK   |
| Empty YAML     | Throws invalid-input error   |
| Empty body     | Still emits valid `.mdc`     |

### Count

8 tests.

# Integration tests

### Location

`test/integration/rule-assembly-cursor-file.test.ts`

### Target

`writeAssembledCursorMdcFile` on a nested path under a temp directory.

| Area     | Asserts (short)           |
|----------|---------------------------|
| Write    | Creates `.cursor/rules/`  |
| Parity   | Matches golden fixture    |

### Count

1 test.

# Golden fixture

`test/fixtures/provider/cursor-rule-expected.mdc` — expected UTF-8 output for the golden case (shared by unit and integration tests).

# Suite status

Full `npm run test:run`: 34 test files, 234 tests, all passing (includes the 9 tests above).

# Gaps (not claimed)

- No tests for install pipeline wiring or CLI paths.

- No round-trip parse of generated YAML beyond string equality.

- Claude / other rule formats are out of scope for this module.

# References

- [2026-04-04-coding-rule-assembly-and-package-refactor](./2026-04-04-coding-rule-assembly-and-package-refactor.md)
