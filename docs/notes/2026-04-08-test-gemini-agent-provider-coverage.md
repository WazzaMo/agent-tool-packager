# Test note: Gemini agent provider and install routing

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

kind: test

This note summarises automated tests added for **`GeminiAgentProvider`**, **`usesGeminiAgentProviderProjectInstall`**, **`agentProviderRemovalDestination`**, and catalog install routing when the Safehouse agent is **gemini**. Install targets are under **`.gemini/`** only (not **`.agents/`**), matching [Feature 5](../features/5-installer-providers-for-known-agents.md). It sits alongside [2026-04-06-test-cursor-agent-provider-and-hooks-merge](./2026-04-06-test-cursor-agent-provider-and-hooks-merge.md) and [2026-04-07-test-standardised-skill-coverage](./2026-04-07-test-standardised-skill-coverage.md).

The same push added **cross-agent** assertions for merge ambiguity stderr (**Cursor** **`.cursor/mcp.json`** / **`hooks.json`** and **Gemini** **`settings.json`**), **`MERGE_CONFIG_AMBIGUITY_HINT`**, and **`atp install --verbose`** JSON; see **Integration: merge ambiguity stderr** below and [2026-04-08-plan-ambiguity-errors-clarity](./2026-04-08-plan-ambiguity-errors-clarity.md).

# New or updated test files

## `test/provider/gemini-agent-provider.test.ts`

Targets **`GeminiAgentProvider`** (`src/provider/gemini-agent-provider.ts`) plan/apply/remove and shared **`applyProviderPlan`**.

- **Rule markdown:** **`plain_markdown_write`** under **`rules/`**; **`fragmentKey`** matches the relative path (e.g. **`rules/g.md`**).
- **Custom command:** **`rule`** asset with **`.toml`** basename → **`raw_file_copy`** to **`commands/<name>.toml`**.
- **MCP asset:** **`mcp_json_merge`** with **`relativeTargetPath`** **`settings.json`**; apply writes **`mcpServers`** into **`.gemini/settings.json`**.
- **MCP conflict:** throws **`McpMergeAmbiguousError`**; **`message`** is the full canonical line ending in **`.gemini/settings.json`** (server **`dup`** in fixture).
- **Hooks conflict:** throws **`HooksMergeAmbiguousError`**; **`message`** is the full canonical line for event **`Ev`** and **`id:h`** under **`.gemini/settings.json`**.
- **Hooks + MCP in one part:** second action **`hooks_json_merge`** into the same **`settings.json`**; asserts both **`mcpServers`** and **`hooks`** after apply.
- **`planRemove`:** no action for **`settings.json`**; deletes a file under **`rules/`** when **`fragmentKey`** is safe.

## `test/install/rule-only-cursor-provider.test.ts`

Adds **`usesGeminiAgentProviderProjectInstall`** (`src/install/rule-only-cursor-provider.ts`).

- **True** for **gemini**, project layer, project prompt scope, rule-only or **mcp + hook** manifests.
- **False** for **cursor** as agent, **user** layer, or when the gate would not select Gemini.

## `test/install/copy-assets.test.ts`

Targets **`agentProviderRemovalDestination`** (`src/install/copy-assets.ts`).

- **Gemini** maps **mcp** and **`hooks.json`** hook rows to **`settings.json`**.
- **Gemini** maps **rule** **`.toml`** to **`commands/`** for uninstall path resolution.

## `test/install/install-package-assets.test.ts`

Targets **`installPackageAssetsForCatalogContext`** (`src/install/install-package-assets.ts`).

- **Gemini** project context: rule install goes through the provider and lands under **`.gemini/rules/`**.

## `test/file-ops/mcp-json-merge.test.ts`

- Ambiguity: exact **`McpMergeAmbiguousError.message`** for default **`mergeTargetLabel`** and for **`.gemini/settings.json`**; **`mergeTargetLabel`** property on the error instance.

## `test/file-ops/cursor-hooks-json-merge.test.ts`

- Ambiguity with **`mergeTargetLabel`**: exact **`HooksMergeAmbiguousError.message`** and **`mergeTargetLabel`** property.

## `test/install/format-install-user-failure.test.ts`

- **`formatInstallUserFailureLines`**: MCP and hooks paths — hint appended; verbose inserts JSON between message and hint; unknown errors stringified.
- **`mergeAmbiguityVerboseRequested`**: flag true; **`DEBUG`** containing **`atp`** among comma-separated tokens.

## Integration: merge ambiguity stderr

### `test/integration/install-force-config-conflicts.test.ts` (Cursor)

- Failed install stderr: full canonical **MCP** line for **`.cursor/mcp.json`** and **hooks** line for **`.cursor/hooks.json`** (server **`atp-force-mcp`**, hook **`beforeSubmit`** / **`id:atp-force-hook`**).
- Asserts **`MERGE_CONFIG_AMBIGUITY_HINT`** appears (imported from **`format-install-user-failure`** for a stable string match).

### `test/integration/install-force-config-conflicts-gemini.test.ts`

- Same pattern for **`.gemini/settings.json`** on MCP and hooks failures.
- Extra case: **`--verbose`** → stderr contains JSON with **`MCP_MERGE_AMBIGUOUS`**, **`serverName`**, **`mergeTargetLabel`**.

### `test/integration/install-cli-config-flags-help.test.ts`

- **`atp install --help`** includes **`--verbose`** alongside existing **`--force-config`** / **`--skip-config`** path copy.

# Pass rate and scope

- These specs run under **`npm run test:run`** with the full suite (all tests must pass in CI).
- **Unit:** provider, install routing, **`mcp-json-merge`**, **`cursor-hooks-json-merge`**, and **`format-install-user-failure`** tests above.
- **Integration:** **`gemini-agent-provider-rule-install.test.ts`**, **`gemini-agent-provider-skill-install.test.ts`**, **`config-merge-journal-install-gemini.test.ts`**, **`install-force-config-conflicts-gemini.test.ts`**, and **`install-cli-config-flags-help.test.ts`** exercise **`dist/atp.js`** with **`atp agent gemini`**, **`.gemini/`** paths, journal rollback into **`settings.json`**, conflict stderr, and install help.
- **Cross-agent integration:** **`install-force-config-conflicts.test.ts`** (Cursor) pairs with the Gemini conflict file for the same canonical message + hint expectations.

# References

| Topic | Location |
|-------|----------|
| Gemini provider | `src/provider/gemini-agent-provider.ts` |
| Plan executor | `src/provider/apply-provider-plan.ts` |
| Install stderr formatting | `src/install/format-install-user-failure.ts` |
| Provider routing (Cursor + Gemini) | `src/install/rule-only-cursor-provider.ts` |
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
