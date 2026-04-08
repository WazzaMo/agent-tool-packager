# Coding: Gemini agent provider (Feature 5)

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Implemented **`GeminiAgentProvider`** for **Gemini CLI** project installs under **`.gemini/`**, aligned with the agent matrix in [Feature 5](../features/5-installer-providers-for-known-agents.md): **rules**, **prompts**, **sub-agent** markdown, **skills** (shared **`buildSkillInstallProviderActions`**), **MCP** and **`hooks.json`** merges into **`settings.json`**, hook scripts under **`hooks/`**, and **`.toml`** rule assets as **custom commands** under **`commands/`**. Install routing checks **`usesGeminiAgentProviderProjectInstall`** before Cursor. Safehouse remove uses **`agentProviderRemovalDestination`**, **`settings.json`**-aware MCP/hooks fragment rollback, and **`removeProviderSkillBundleTrees`** for Cursor and Gemini skill trees.

No change to **`ProviderAction`** DTOs: **`mcp_json_merge`** / **`hooks_json_merge`** already take **`relativeTargetPath`**; Gemini passes **`settings.json`**.

Test coverage is summarised in [2026-04-08-test-gemini-agent-provider-coverage](./2026-04-08-test-gemini-agent-provider-coverage.md).

# Part type coverage (Gemini)

| Area | On disk | Status |
|------|---------|--------|
| Rule (markdown) | `.gemini/rules/` | Done |
| Prompt | `.gemini/prompts/` | Done |
| Sub-agent | `.gemini/rules/` | Done |
| Skill | `.gemini/skills/{name}/` | Done (shared skill module) |
| Hook JSON | merge into `settings.json` | Done |
| Hook scripts | `.gemini/hooks/` | Done |
| Mcp | merge into `settings.json` | Done |
| Command (`.toml`) | `.gemini/commands/` via `rule` + ext | Done |
| Program | `copyProgramAssetsOnly` after provider | Done (same as Cursor) |

Enrichment still maps **Command** / **Experimental** parts to **`rule`** assets where applicable; **`.toml`** routing is by file extension in the provider.

# Code layout

- `src/provider/gemini-agent-provider.ts` — **`GeminiAgentProvider`**, **`createGeminiAgentProvider`**; **`planRemove`** blocks full delete of **`settings.json`**.

- `src/install/rule-only-cursor-provider.ts` — Shared gate helper plus **`usesGeminiAgentProviderProjectInstall`** and existing **`usesCursorAgentProviderProjectInstall`**.

- `src/install/install-package-assets.ts` — Gemini provider branch (before Cursor), then programs-only copy.

- `src/install/copy-assets.ts` — **`agentProviderRemovalDestination`** for Gemini vs default Cursor-style paths.

- `src/remove/remove-safehouse.ts` — **`mergedMcpConfigRelativePath`** / **`mergedHooksConfigRelativePath`** (Gemini → **`settings.json`**); **`removeProviderSkillBundleTrees`** for **cursor** and **gemini**; per-asset loop skips **skill** when bundle removal ran.

- `src/provider/skill/remove-skill-bundles.ts` — **`removeProviderSkillBundleTrees`** (partition by **`part_N_Type/`** prefix, resolve bundle + skill dir name, **`rmSync`**).

- `src/provider/skill/index.ts` — Re-exports **`removeProviderSkillBundleTrees`**.

# Behaviour notes

### `settings.json` and journal

Two merge actions (MCP then hooks) append two journal entries with the same **`agent_relative_path`** (**`settings.json`**). Rollback applies entries in **reverse** order, so paired undo remains consistent.

### Workspace `GEMINI.md`

Not written by the provider. Packaged rules use **`.gemini/rules/`** to avoid clobbering a single root file when multiple rule assets exist. Optional follow-up: explicit project-root **`GEMINI.md`** or **`writeRoot`** on plan actions.

### Uninstall and legacy skill files

Provider skill removal targets **`skills/{dir}/`** trees. Flat **`skills/<file>`** left by legacy **`copyPackageAssets`** is not removed by the bundle helper; the per-asset unlink is skipped for **skill** rows when the agent is **cursor** or **gemini**.

# Next steps

- **Integration:** Add a **`dist/atp.js`** test mirroring **`cursor-agent-provider-rule-install.test.ts`** (Station + Safehouse + **`atp agent gemini`**, assert **`.gemini/`** and **`settings.json`** merges + journal rollback).

- **Journal E2E:** Extend **`config-merge-journal`** integration to a Gemini fixture so **`settings.json`** exact and fragment rollback are asserted under **`.gemini/`**.

- **`ClaudeAgentProvider`:** Matrix uses **`.mcp.json`** / **`settings.json`** split for hooks; implement with the same plan primitives and removal map (not the Gemini **`settings.json`**-only shortcut).

- **User / station layer:** **`usesGeminiAgentProviderProjectInstall`** is **false** when **`layer`** is **user**; **`buildProviderInstallContext`** already resolves **`layerRoot`** to agent home. Wire Gemini provider for user-layer installs when product wants parity.

- **First-class `command` asset type:** If **`PackageAsset`** / enrichment gain **`command`**, route **`.toml`** without overloading **`rule`**.

- **Install root:** ATP standardises Gemini project installs on **`.gemini/`** only (including **`skills/`**); **`.agents/`** is not used for **`GeminiAgentProvider`**. See [Feature 5 — Installer providers](../features/5-installer-providers-for-known-agents.md) (Gemini CLI → Skill; path conventions).

- **CLI copy:** Consider mentioning **`settings.json`** in **`--skip-config`** / **`--force-config`** help text next to **`mcp.json`** / **`hooks.json`** for Gemini users.

# References

| Topic | Location |
|-------|----------|
| Test note | [2026-04-08-test-gemini-agent-provider-coverage](./2026-04-08-test-gemini-agent-provider-coverage.md) |
| Cursor provider coding | [2026-04-06-coding-cursor-agent-provider-install](./2026-04-06-coding-cursor-agent-provider-install.md) |
| Provider capability matrix | [2026-04-03-plan-provider-capability-matrix](./2026-04-03-plan-provider-capability-matrix.md) |
