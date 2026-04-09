# Test note: Cursor agent provider install and hooks JSON merge

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

kind: test

Automated tests added or updated for **`CursorAgentProvider`** (rules, skills, prompts, hooks, MCP merge, program copy split), **`usesCursorAgentProviderProjectInstall`** routing, and **`mergeHooksJsonDocument`**. They complement the earlier install-pipeline note
[2026-04-06-test-install-pipeline-and-agent-guards](./2026-04-06-test-install-pipeline-and-agent-guards.md).

# New or updated test files

## `test/file-ops/hooks-json-merge.test.ts`

Targets **`mergeHooksJsonDocument`** (`src/file-ops/hooks-merge/hooks-json-merge.ts`).

- Appends handlers on the same event key and **dedupes** entries that share an **`id`**.
- **`skipConfig: true`** returns a clone of the existing document with **`changed`** false (no merge).

## `test/provider/cursor-agent-provider.test.ts`

Targets **`CursorAgentProvider`** plan/apply/remove (`src/provider/cursor-agent-provider.ts`) and **`applyProviderPlan`**.

- **Rule**: **`plain_markdown_write`** under **`rules/`**; **`fragmentKey`** matches relative path (e.g. **`rules/alpha.md`**).
- **Skill** part: plan targets **`skills/`** (no longer rejects non-**Rule** part kinds).
- **`.mdc`**: splittable frontmatter uses **`RuleAssembly`** operation id and normalised assembled body.
- **MCP asset**: emits **`mcp_json_merge`**; apply creates **`.cursor/mcp.json`** with expected **`mcpServers`**.
- **`planRemove`**: deletes a file under **`rules/`** by safe **`fragmentKey`**; **does not** emit actions for **`mcp.json`**.

## `test/install/catalog-install-agent-provider-routing.test.ts`

Targets **`usesCursorAgentProviderProjectInstall`** (`src/install/catalog-install-agent-provider-routing.ts`).

- **True** for Cursor project scope with **rule-only**, **skill-only**, **mcp-only**, **rule+skill**, and **program-only** manifests (programs copied separately after the provider run).
- **False** for non-Cursor agent, **user** layer, **station** prompt scope, or **empty** **`assets`**.

## `test/install/install-package-assets.test.ts`

Targets **`installPackageAssetsForCatalogContext`** (`src/install/install-package-assets.ts`).

- Skill-only Cursor project install goes through the **provider** path and materialises under **`.cursor/skills/`** (replacing the previous “legacy copy only” expectation).

## `test/integration/cursor-agent-provider-rule-install.test.ts`

- Gate assertion uses **`usesCursorAgentProviderProjectInstall`** (renamed from **`isRuleOnlyCursorProjectInstall`**).
- **E2E**: **`atp install`** with temp Station + Safehouse + Cursor agent; rule file lands under **`.cursor/rules/`**.

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
