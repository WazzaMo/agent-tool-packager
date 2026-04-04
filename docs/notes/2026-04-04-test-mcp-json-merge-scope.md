# Test: MCP JSON merge scope

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Scope

This note records **test coverage** for the MCP **`mcpServers`** merge prototype (`src/provider/mcp-merge/`). It does not re-document product behaviour; see [2026-04-04-coding-mcp-json-merge-provider](./2026-04-04-coding-mcp-json-merge-provider.md).

## Unit tests

**File:** `test/provider/mcp-json-merge.test.ts`  
**Target:** `mergeMcpJsonDocument` (in-memory only).

| Area | What is asserted |
|------|------------------|
| Create | Missing document + payload → **applied**, document equals payload shape. |
| Amend | Unrelated top-level keys preserved when adding a server. |
| Idempotency | Second merge with same payload → **noop**, document unchanged. |
| Ambiguity | Same server name, different config → `McpMergeAmbiguousError` (name + code). |
| Force | `forceConfig: true` overwrites conflicting entry. |
| Skip | `skipConfig: true` → **skipped**, existing document unchanged; missing doc → `{}`. |
| Validation | Payload without `mcpServers`, non-object `mcpServers`, existing `mcpServers` not a plain object → appropriate errors. |

**Count:** 10 tests.

## Integration tests

**File:** `test/integration/mcp-json-merge-files.test.ts`  
**Target:** `applyMcpJsonMergeToFile`, `readJsonObjectFile`, and one parity check on `mergeMcpJsonDocument` for a settings-shaped root.

| Area | What is asserted |
|------|------------------|
| Create | Missing path → directories created, file written, round-trip JSON matches. |
| Amend | Existing `settings.json`-like file gains a second server; unrelated key kept. |
| Idempotency | Second apply → **noop**, file **mtime** unchanged (no rewrite). |
| Ambiguity | On-disk conflict → rejects with `McpMergeAmbiguousError`. |
| Force | `forceConfig` updates on-disk entry. |
| Skip | `skipConfig` → no file created when missing. |
| Invalid JSON | Existing corrupt file → `McpMergeInvalidDocumentError` / message mentions invalid JSON. |
| Settings parity | `hooks` + `mcpServers` root: only `mcpServers` extended. |

**Count:** 8 tests (7 file-focused + 1 parity).

## Suite status

Full **`npm run test:run`**: **32** files, **225** tests, all passing (includes the **18** tests above).

## Gaps (not claimed)

- No tests yet for **CLI** flags (`--force-config`, `--skip-config`) or install pipeline integration.
- No property-based or fuzz tests on JSON shapes.
- No concurrent writers / locking.
- Other file-operation ids (hooks graph, TOML, rules, trees) are **untested** here by design.

## References

- [2026-04-04-coding-mcp-json-merge-provider](./2026-04-04-coding-mcp-json-merge-provider.md)
