# Test: MCP JSON merge scope

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Scope

This note records test coverage for the MCP `mcpServers` merge prototype (`src/file-ops/mcp-merge/`). It does not re-document product behaviour; see [2026-04-04-coding-mcp-json-merge-provider](./2026-04-04-coding-mcp-json-merge-provider.md).

# Unit tests

### Location

`test/file-ops/mcp-json-merge.test.ts`

### Target

`mergeMcpJsonDocument` (in-memory only).

| Area        | Asserts (short)           |
|-------------|---------------------------|
| Create      | Applied; shape matches    |
| Amend       | Extra keys preserved      |
| Idempotency | Second run noop           |
| Ambiguity   | Throws named error        |
| Force       | Overwrite on conflict     |
| Skip        | Skipped; doc unchanged    |
| Validation  | Bad payload / shape err   |

(1) Create: missing document plus payload yields applied and document equals payload shape.

(2) Skip: `skipConfig: true` keeps existing document; missing doc yields `{}`.

(3) Validation: payload without `mcpServers`, non-object `mcpServers`, or existing `mcpServers` not a plain object.

### Count

10 tests.

# Integration tests

### Location

`test/integration/mcp-json-merge-files.test.ts`

### Target

`applyMcpJsonMergeToFile`, `readJsonObjectFile`, and one parity case for `mergeMcpJsonDocument` on a settings-shaped root.

| Area            | Asserts (short)         |
|-----------------|-------------------------|
| Create          | Dirs + file + JSON OK   |
| Amend           | Second server + keys    |
| Idempotency     | No rewrite; mtime same  |
| Ambiguity       | Rejects on conflict     |
| Force           | Overwrites on disk      |
| Skip            | No file if missing      |
| Invalid JSON    | Parse error surfaced    |
| Settings parity | Only `mcpServers` grows |

### Count

8 tests (7 file-focused plus 1 parity).

# Suite status

Full `npm run test:run`: 34 test files, 234 tests, all passing (includes the 18 tests above).

# Gaps (not claimed)

- No tests yet for CLI flags (`--force-config`, `--skip-config`) or install pipeline integration.

- No property-based or fuzz tests on JSON shapes.

- No concurrent writers or locking.

- Other file-operation ids (hooks graph, TOML, rules, trees) are untested here by design.

# References

- [2026-04-04-coding-mcp-json-merge-provider](./2026-04-04-coding-mcp-json-merge-provider.md)
