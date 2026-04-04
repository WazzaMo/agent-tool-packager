# Coding: MCP JSON merge provider prototype

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Implemented step 3 of the installer file-operations plan: a prototype merge for `mcpServers` in standalone MCP JSON (for example `.cursor/mcp.json`, `.mcp.json`) and the same key inside `settings.json`, with unit and integration tests. This matches internal-DTO intent for operation 1 (whole-file JSON) and operation 8 (nested `settings.json` slice).

# Code layout

- `src/provider/operation-ids.ts` — Numeric `OperationIds` (1–12) aligned with `2026-04-03-plan-provider-internal-dtos.md`.

- `src/provider/mcp-merge/errors.ts` — `McpMergeAmbiguousError`, `McpMergeInvalidDocumentError`, `McpMergeInvalidPayloadError`.

- `src/provider/mcp-merge/mcp-json-merge.ts` — `mergeMcpJsonDocument(existing, incoming, options)`; preserves non-`mcpServers` top-level keys; merge is by server name with `util.isDeepStrictEqual` for idempotency.

- `src/provider/mcp-merge/apply-mcp-json-merge.ts` — `readJsonObjectFile`, `applyMcpJsonMergeToFile` (create parent dirs on write; noop avoids rewriting the file).

- `src/provider/mcp-merge/index.ts` — Re-exports for callers.

# Behaviour

### Missing file

Treated as empty document; merge can create the file with formatted JSON.

### Existing file

Amends only the `mcpServers` object; other keys unchanged.

### Idempotency

Same payload again yields noop (no write).

### Ambiguity

Same server name with different config throws `McpMergeAmbiguousError` unless `forceConfig` is true (intended CLI mapping: `--force-config` / `--skip-config` from the capability-matrix decisions).

### skipConfig

Skips disk I/O in `applyMcpJsonMergeToFile`; merge helper returns a skipped outcome with the existing document (or `{}` if none).

# Tests

- `test/provider/mcp-json-merge.test.ts` — Pure merge cases.

- `test/integration/mcp-json-merge-files.test.ts` — Temp-dir filesystem: create, amend, noop/idempotency, ambiguity, `forceConfig`, `skipConfig`, invalid JSON.

# Not in this change

Hooks JSON (`hooks.json`), `settings.json` hooks slice, TOML (Codex), rule assembly, tree materialise, and CLI wiring for `--force-config` / `--skip-config` are out of scope for this prototype.

# References

- [2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md) — step 3.

- [2026-04-03-plan-provider-internal-dtos](./2026-04-03-plan-provider-internal-dtos.md) — DTO shapes.

- [2026-04-03-plan-provider-capability-matrix](./2026-04-03-plan-provider-capability-matrix.md) — open decisions (user control, idempotency).
