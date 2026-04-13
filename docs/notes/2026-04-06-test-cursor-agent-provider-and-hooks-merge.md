# Test note: Cursor agent provider install and hooks JSON merge

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

**Kind:** test

Automated tests added or updated for **`CursorAgentProvider`** (rules, skills, prompts, hooks, MCP merge, program copy split), **`usesCursorAgentProviderProjectInstall`** routing, and **`mergeHooksJsonDocument`**.

They complement the earlier install-pipeline note [2026-04-06-test-install-pipeline-and-agent-guards](./2026-04-06-test-install-pipeline-and-agent-guards.md).

# New or updated test files

## `test/file-ops/hooks-json-merge.test.ts`

Targets **`mergeHooksJsonDocument`** (`src/file-ops/hooks-merge/hooks-json-merge.ts`).

### Append and dedupe

Appends handlers on the same event key and **dedupes** entries that share an **`id`**.

### Skip config

**`skipConfig: true`** returns a clone of the existing document with **`changed`** false (no merge).

## `test/provider/cursor-agent-provider.test.ts`

Targets **`CursorAgentProvider`** plan/apply/remove (`src/provider/cursor-agent-provider.ts`) and **`applyProviderPlan`**.

### Rules

**`plain_markdown_write`** under **`rules/`**; **`fragmentKey`** matches the relative path (for example **`rules/alpha.md`**).

### Skills

Skill part plans target **`skills/`** (provider no longer rejects non-**Rule** part kinds).

### Cursor MDC rules

Splittable frontmatter uses **`RuleAssembly`** operation id and a normalised assembled body.

### MCP

Emits **`mcp_json_merge`**; apply creates **`.cursor/mcp.json`** with expected **`mcpServers`**.

### Plan remove

Deletes a file under **`rules/`** by safe **`fragmentKey`**; **does not** emit remove actions for **`mcp.json`**.

## `test/install/catalog-install-agent-provider-routing.test.ts`

Targets **`usesCursorAgentProviderProjectInstall`** (`src/install/catalog-install-agent-provider-routing.ts`).

### When the gate is true

Cursor project scope with **rule-only**, **skill-only**, **mcp-only**, **rule+skill**, or **program-only** manifests (programs are copied separately after the provider run).

### When the gate is false

Non-Cursor agent, **user** layer, **station** prompt scope, or **empty** **`assets`**.

## `test/install/install-package-assets.test.ts`

Targets **`installPackageAssetsForCatalogContext`** (`src/install/install-package-assets.ts`).

### Skill-only Cursor install

Goes through the **provider** path and materialises under **`.cursor/skills/`** (replacing the earlier “legacy copy only” expectation).

## `test/integration/cursor-agent-provider-rule-install.test.ts`

### Routing gate

Uses **`usesCursorAgentProviderProjectInstall`** (renamed from **`isRuleOnlyCursorProjectInstall`**).

### End-to-end install

**`atp install`** with temp Station + Safehouse + Cursor agent; rule file lands under **`.cursor/rules/`**.

# Pass rate and scope

- All of the above run under **`npm run test:run`** (full suite).
- Integration specs use the built CLI at **`dist/atp.js`**; run **`npm run build`** before local integration runs if **`dist`** is stale. CI runs **build** then **test**.

# References

| Topic | Location |
|-------|----------|
| Cursor provider | `src/provider/cursor-agent-provider.ts` |
| Plan executor | `src/provider/apply-provider-plan.ts` |
| Provider DTOs | `src/provider/provider-dtos.ts` |
| Cursor routing gate | `src/install/catalog-install-agent-provider-routing.ts` |
| Install routing | `src/install/install-package-assets.ts` |
| Hooks merge | `src/file-ops/hooks-merge/hooks-json-merge.ts` |
| MCP merge (related) | `src/file-ops/mcp-merge/mcp-json-merge.ts` |
