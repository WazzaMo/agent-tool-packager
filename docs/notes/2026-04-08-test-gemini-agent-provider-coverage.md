# Test note: Gemini agent provider and install routing

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

kind: test

This note summarises automated tests added for **`GeminiAgentProvider`**, **`usesGeminiAgentProviderProjectInstall`**, **`agentProviderRemovalDestination`**, and catalog install routing when the Safehouse agent is **gemini**. It sits alongside [2026-04-06-test-cursor-agent-provider-and-hooks-merge](./2026-04-06-test-cursor-agent-provider-and-hooks-merge.md) and [2026-04-07-test-standardised-skill-coverage](./2026-04-07-test-standardised-skill-coverage.md).

# New or updated test files

## `test/provider/gemini-agent-provider.test.ts`

Targets **`GeminiAgentProvider`** (`src/provider/gemini-agent-provider.ts`) plan/apply/remove and shared **`applyProviderPlan`**.

- **Rule markdown:** **`plain_markdown_write`** under **`rules/`**; **`fragmentKey`** matches the relative path (e.g. **`rules/g.md`**).
- **Custom command:** **`rule`** asset with **`.toml`** basename → **`raw_file_copy`** to **`commands/<name>.toml`**.
- **MCP asset:** **`mcp_json_merge`** with **`relativeTargetPath`** **`settings.json`**; apply writes **`mcpServers`** into **`.gemini/settings.json`**.
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

# Pass rate and scope

- These specs run under **`npm run test:run`** with the full suite (all tests must pass in CI).
- The new coverage is **unit** only; no dedicated **`atp install`** integration spec for Gemini was added in this round.

#### Follow-up integration ideas

- Mirror **`cursor-agent-provider-rule-install.test.ts`**: temp Station + Safehouse + **`atp agent gemini`**, then assert files under **`.gemini/`** and **`settings.json`** merges.
- **`config-merge-journal`** integration today exercises **`.cursor/mcp.json`** / **`hooks.json`**; Gemini uses the same journal types with **`settings.json`** paths (behaviour shared with **`applyProviderPlan`**, not separately asserted end-to-end).

# References

| Topic | Location |
|-------|----------|
| Gemini provider | `src/provider/gemini-agent-provider.ts` |
| Plan executor | `src/provider/apply-provider-plan.ts` |
| Provider routing (Cursor + Gemini) | `src/install/rule-only-cursor-provider.ts` |
| Install routing | `src/install/install-package-assets.ts` |
| Removal paths + skill tree cleanup | `src/install/copy-assets.ts`, `src/remove/remove-safehouse.ts`, `src/provider/skill/remove-skill-bundles.ts` |
| Agent matrix | [Feature 5 — Installer providers](../features/5-installer-providers-for-known-agents.md) |

# Commands

```bash
npm run test:run
npm run lint
npm run build && npm run test:run
```
