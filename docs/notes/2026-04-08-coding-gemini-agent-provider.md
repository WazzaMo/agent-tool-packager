# Coding: Gemini agent provider (Feature 5)

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Implemented **`GeminiAgentProvider`** for **Gemini CLI** project installs under **`.gemini/`**, aligned with the agent matrix in [Feature 5](../features/5-installer-providers-for-known-agents.md): **rules**, **prompts**, **sub-agent** markdown, **skills** (shared **`buildSkillInstallProviderActions`**), **MCP** and **`hooks.json`** merges into **`settings.json`**, hook scripts under **`hooks/`**, and **`.toml`** rule assets as **custom commands** under **`commands/`**. Install routing checks **`usesGeminiAgentProviderProjectInstall`** before Cursor. Safehouse remove uses **`agentProviderRemovalDestination`**, **`settings.json`**-aware MCP/hooks fragment rollback, and **`removeProviderSkillBundleTrees`** for Cursor and Gemini skill trees.

No change to **`ProviderAction`** DTOs: **`mcp_json_merge`** / **`hooks_json_merge`** already take **`relativeTargetPath`**; Gemini passes **`settings.json`**.

Test coverage is summarised in [2026-04-08-test-gemini-agent-provider-coverage](./2026-04-08-test-gemini-agent-provider-coverage.md).

Merge ambiguity messaging and install stderr behaviour (canonical **`McpMergeAmbiguousError`** / **`HooksMergeAmbiguousError`** lines, hint line, **`atp install --verbose`**, **`DEBUG=atp`**) are documented in [2026-04-08-plan-ambiguity-errors-clarity](./2026-04-08-plan-ambiguity-errors-clarity.md) and apply to **Cursor and Gemini** (and any future provider using **`applyProviderPlan`**).

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

# Merge config ambiguity and install stderr (same day)

Cross-cutting install UX, not Gemini-specific but exercised heavily against **`.gemini/settings.json`** in tests.

- `src/file-ops/mcp-merge/errors.ts` / `src/file-ops/hooks-merge/errors.ts` — **`McpMergeAmbiguousError`** and **`HooksMergeAmbiguousError`** use one canonical sentence each (**what** / **where** / **`--force-config`** / **`--skip-config`**); both expose readonly **`mergeTargetLabel`** (default **`the merged configuration file`** when callers omit it).

- `src/install/format-install-user-failure.ts` — **`formatInstallUserFailureLines`**, **`MERGE_CONFIG_AMBIGUITY_HINT`**, **`mergeAmbiguityVerboseRequested`** (**`--verbose`** or **`DEBUG`** token **`atp`**).

- `src/install/install.ts` — **`executeCatalogInstall`** rethrows the two merge ambiguity types so they are not wrapped in **`Install copy or manifest update failed`**; **`installPackage`** prints **`formatInstallUserFailureLines`** on failure (message, optional JSON line, hint).

- `src/commands/install.ts` — **`atp install --verbose`** option.

- `src/install/types.ts` — **`InstallOptions.verbose`**.

**`applyProviderPlan`** (`src/provider/apply-provider-plan.ts`) already passes **`mergeConfigTargetLabel(layerRoot, relativeTargetPath)`** into merges; no provider-only code change was required for path-accurate messages.

# Behaviour notes

### `settings.json` and journal

Two merge actions (MCP then hooks) append two journal entries with the same **`agent_relative_path`** (**`settings.json`**). Rollback applies entries in **reverse** order, so paired undo remains consistent.

### Workspace `GEMINI.md`

Not written by the provider. Packaged rules use **`.gemini/rules/`** to avoid clobbering a single root file when multiple rule assets exist. Optional follow-up: explicit project-root **`GEMINI.md`** or **`writeRoot`** on plan actions.

### Uninstall and legacy skill files

Provider skill removal targets **`skills/{dir}/`** trees. Flat **`skills/<file>`** left by legacy **`copyPackageAssets`** is not removed by the bundle helper; the per-asset unlink is skipped for **skill** rows when the agent is **cursor** or **gemini**.

# Next steps

- **`ClaudeAgentProvider`:** Matrix uses **`.mcp.json`** / **`settings.json`** split for hooks; implement with the same plan primitives and removal map (not the Gemini **`settings.json`**-only shortcut).

- **User / station layer:** **`usesGeminiAgentProviderProjectInstall`** is **false** when **`layer`** is **user**; **`buildProviderInstallContext`** already resolves **`layerRoot`** to agent home. Wire Gemini provider for user-layer installs when product wants parity.

- **First-class `command` asset type:** If **`PackageAsset`** / enrichment gain **`command`**, route **`.toml`** without overloading **`rule`**.

- **Install root:** ATP standardises Gemini project installs on **`.gemini/`** only (including **`skills/`**); **`.agents/`** is not used for **`GeminiAgentProvider`**. See [Feature 5 — Installer providers](../features/5-installer-providers-for-known-agents.md) (Gemini CLI → Skill; path conventions).

# Done since this note was first written

- **Integration:** **`gemini-agent-provider-rule-install.test.ts`**, **`gemini-agent-provider-skill-install.test.ts`**, **`config-merge-journal-install-gemini.test.ts`**, and **`install-force-config-conflicts-gemini.test.ts`** cover **`dist/atp.js`**, **`atp agent gemini`**, **`.gemini/`**, **`settings.json`** merges, journal rollback, and conflict stderr.

- **CLI help:** **`--force-config`** / **`--skip-config`** / **`--verbose`** mention Cursor and Gemini paths where relevant (**`commands/install.ts`**).

- **Ambiguity plan:** Implemented per [2026-04-08-plan-ambiguity-errors-clarity](./2026-04-08-plan-ambiguity-errors-clarity.md) (errors, hint, **`--verbose`**, install rethrow).

- **User docs:** Merge policy and troubleshooting in [Feature 5](../features/5-installer-providers-for-known-agents.md#merge-policy-and-troubleshooting-for-atp-install), [configuration](../configuration.md#catalog-install-and-merged-agent-json), and [README](../../README.md).

# References

| Topic | Location |
|-------|----------|
| Install stderr formatting | `src/install/format-install-user-failure.ts` |
| Ambiguity errors plan + status | [2026-04-08-plan-ambiguity-errors-clarity](./2026-04-08-plan-ambiguity-errors-clarity.md) |
| Test note | [2026-04-08-test-gemini-agent-provider-coverage](./2026-04-08-test-gemini-agent-provider-coverage.md) |
| Cursor provider coding | [2026-04-06-coding-cursor-agent-provider-install](./2026-04-06-coding-cursor-agent-provider-install.md) |
| Provider capability matrix | [2026-04-03-plan-provider-capability-matrix](./2026-04-03-plan-provider-capability-matrix.md) |
