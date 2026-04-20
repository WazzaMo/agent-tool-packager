# Test note: Gemini agent provider and install routing

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

**Kind:** test

This note summarises automated tests added for **`GeminiAgentProvider`**, **`usesGeminiAgentProviderProjectInstall`**, **`agentProviderRemovalDestination`**, and catalog install routing when the Safehouse agent is **gemini**. Install targets are under **`.gemini/`** only (not **`.agents/`**), matching [Feature 5](../features/5-installer-providers-for-known-agents.md).

It sits alongside [2026-04-06-test-cursor-agent-provider-and-hooks-merge](./2026-04-06-test-cursor-agent-provider-and-hooks-merge.md) and [2026-04-07-test-standardised-skill-coverage](./2026-04-07-test-standardised-skill-coverage.md).

The same push added **cross-agent** assertions for merge ambiguity stderr (**Cursor** **`.cursor/mcp.json`** / **`hooks.json`** and **Gemini** **`settings.json`**), **`MERGE_CONFIG_AMBIGUITY_HINT`**, and **`atp install --verbose`** JSON. See **Integration: merge ambiguity stderr** below and [2026-04-08-plan-ambiguity-errors-clarity](./2026-04-08-plan-ambiguity-errors-clarity.md).

# New or updated test files

## `test/provider/gemini-agent-provider.test.ts`

Targets **`GeminiAgentProvider`** (`src/provider/gemini-agent-provider.ts`) plan/apply/remove and shared **`applyProviderPlan`**.

### Rule markdown

Uses **`plain_markdown_write`** under **`rules/`**; **`fragmentKey`** matches the relative path (for example **`rules/g.md`**).

### Custom commands from TOML

A **`rule`** asset whose basename is **`.toml`** maps to **`raw_file_copy`** into **`commands/<name>.toml`**.

### MCP merge into settings

**`mcp_json_merge`** uses **`relativeTargetPath`** **`settings.json`**; apply writes **`mcpServers`** into **`.gemini/settings.json`**.

### MCP merge ambiguity

Throws **`McpMergeAmbiguousError`**; **`message`** is the full canonical line ending in **`.gemini/settings.json`** (server **`dup`** in fixture).

### Hooks merge ambiguity

Throws **`HooksMergeAmbiguousError`**; **`message`** is the full canonical line for event **`Ev`** and **`id:h`** under **`.gemini/settings.json`**.

### MCP and hooks in one part

Second action **`hooks_json_merge`** into the same **`settings.json`**; asserts both **`mcpServers`** and **`hooks`** after apply.

### Plan remove

No remove action for **`settings.json`**; deletes a file under **`rules/`** when **`fragmentKey`** is safe.

## `test/install/catalog-install-agent-provider-routing.test.ts`

Adds **`usesGeminiAgentProviderProjectInstall`** (`src/install/catalog-install-agent-provider-routing.ts`).

### When the gate is true

**gemini**, project layer, project prompt scope, and rule-only or **mcp + hook** manifests.

### When the gate is false

**cursor** as agent, **user** layer, or any case where Gemini routing should not apply.

## `test/install/copy-assets.test.ts`

Targets **`agentProviderRemovalDestination`** (`src/install/copy-assets.ts`).

### MCP and hooks removal paths

**Gemini** maps **mcp** and **`hooks.json`** hook rows to **`settings.json`**.

### TOML rules as commands

**Gemini** maps **rule** assets with **`.toml`** extension to **`commands/`** for uninstall path resolution.

## `test/install/install-package-assets.test.ts`

Targets **`installPackageAssetsForCatalogContext`** (`src/install/install-package-assets.ts`).

### Gemini project install

Rule install goes through the provider and lands under **`.gemini/rules/`**.

## `test/file-ops/mcp-json-merge.test.ts`

### Ambiguity messages

Exact **`McpMergeAmbiguousError.message`** for default **`mergeTargetLabel`** and for **`.gemini/settings.json`**; error exposes **`mergeTargetLabel`**.

## `test/file-ops/hooks-json-merge.test.ts`

### Ambiguity messages

Exact **`HooksMergeAmbiguousError.message`** with **`mergeTargetLabel`** on the error instance.

## `test/install/format-install-user-failure.test.ts`

### User-facing failure lines

**`formatInstallUserFailureLines`**: MCP and hooks paths append the hint; verbose mode inserts JSON between message and hint; unknown errors stringify cleanly.

### Verbose merge detection

**`mergeAmbiguityVerboseRequested`**: true when expected; **`DEBUG`** may list **`atp`** among comma-separated tokens.

## Integration: merge ambiguity stderr

### `test/integration/install-force-config-conflicts.test.ts` (Cursor)

Failed install stderr includes the full canonical **MCP** line for **`.cursor/mcp.json`** and the hooks line for **`.cursor/hooks.json`** (server **`atp-force-mcp`**, hook **`beforeSubmit`** / **`id:atp-force-hook`**).

Asserts **`MERGE_CONFIG_AMBIGUITY_HINT`** appears (imported from **`format-install-user-failure`** for a stable string match).

### `test/integration/install-force-config-conflicts-gemini.test.ts`

Same pattern for **`.gemini/settings.json`** on MCP and hooks failures.

Extra case: **`--verbose`** makes stderr contain JSON with **`MCP_MERGE_AMBIGUOUS`**, **`serverName`**, **`mergeTargetLabel`**.

### `test/integration/install-cli-config-flags-help.test.ts`

**`atp install --help`** lists **`--verbose`** next to **`--force-config`** / **`--skip-config`** where paths are described.

# Pass rate and scope

These specs run under **`npm run test:run`** with the full suite (all tests must pass in CI).

## Unit coverage

Provider, install routing, **`mcp-json-merge`**, **`hooks-json-merge`**, and **`format-install-user-failure`** as listed above.

## Integration coverage

**`gemini-agent-provider-rule-install.test.ts`**, **`gemini-agent-provider-skill-install.test.ts`**, **`config-merge-journal-install-gemini.test.ts`**, **`install-force-config-conflicts-gemini.test.ts`**, and **`install-cli-config-flags-help.test.ts`** exercise **`dist/atp.js`** with **`atp agent gemini`**, **`.gemini/`** paths, journal rollback into **`settings.json`**, conflict stderr, and install help.

## Cross-agent checks

**`install-force-config-conflicts.test.ts`** (Cursor) pairs with the Gemini conflict file for the same canonical message and hint expectations.

# References

| Topic | Location |
|-------|----------|
| Gemini provider | `src/provider/gemini-agent-provider.ts` |
| Plan executor | `src/provider/apply-provider-plan.ts` |
| Install stderr formatting | `src/install/format-install-user-failure.ts` |
| Provider routing (Cursor + Gemini) | `src/install/catalog-install-agent-provider-routing.ts` |
| Install routing | `src/install/install-package-assets.ts` |
| Removal paths + skill tree cleanup | `src/install/copy-assets.ts`, `src/remove/remove-safehouse.ts`, `src/provider/skill/remove-skill-bundles.ts` |
| Ambiguity plan + behaviour | [2026-04-08-plan-ambiguity-errors-clarity](./2026-04-08-plan-ambiguity-errors-clarity.md) |
| Coding note (same day) | [2026-04-08-coding-gemini-agent-provider](./2026-04-08-coding-gemini-agent-provider.md) |
| Agent matrix | [Feature 5 — Installer providers](../features/5-installer-providers-for-known-agents.md) |

# Commands

```bash
npm run test:run
npm run lint
npm run build && npm run test:run
```
