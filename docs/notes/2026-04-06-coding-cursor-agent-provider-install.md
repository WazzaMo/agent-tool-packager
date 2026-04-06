# Coding: Cursor agent provider install (rules, skills, MCP, hooks)

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Generalised **Cursor** project installs so **`CursorAgentProvider`** plans and applies **rules** (plain `.md` and assembled `.mdc`), **skills** (Agent Skills layout under **`skills/{name}/`** via shared helpers), **prompts**, **sub-agent** markdown, **`hooks.json`** merge plus hook scripts under **`hooks/`**, and **`mcp.json`** merge via **`mergeMcpJsonDocument`**. **`program`** rows are **not** in the provider plan; **`copyProgramAssetsOnly`** runs after the provider loop. Install routing uses **`usesCursorAgentProviderProjectInstall`** (Cursor + project layer + project prompt scope + only provider-handled asset types or programs). **`InstallOptions`** and **`atp install`** expose **`--force-config`** and **`--skip-config`** for MCP merge behaviour (and hooks skip for config merges).

**Update (2026-04-07):** Skill assets no longer use the same flat markdown path as rules. They are planned by **`buildSkillInstallProviderActions`** in **`src/provider/skill/`** (validated / assembled **`SKILL.md`**, optional **`raw_file_copy`** for sibling staged files). See [2026-04-07-note-standardised-skill-provider](./2026-04-07-note-standardised-skill-provider.md).

# Part type coverage

The CursorAgentProvider handles asset types derived from canonical part types.
Programs (from bundles) are handled separately via **`copyProgramAssetsOnly`**.

| Part Type    | Asset Type | Provider action(s) | Status |
|--------------|------------|--------------------|--------|
| Rule         | rule       | `plain_markdown_write` | ✅ |
| Prompt       | prompt     | `plain_markdown_write` | ✅ |
| Skill        | skill      | `plain_markdown_write` (**`SKILL.md`**) + `raw_file_copy` (extras) via **`buildSkillInstallProviderActions`** | ✅ |
| Hook         | hook       | `hooks_json_merge` + `raw_file_copy` | ✅ |
| Mcp          | mcp        | `mcp_json_merge` | ✅ |
| Command      | rule (1)   | markdown handled | ✅ |
| Experimental | rule (1)   | markdown handled | ✅ |
| Multi        | (varies)   | per-part dispatch | ✅ |

(1) Command and Experimental components map to `rule` asset type via fallback in
**`componentAssetTypeForPart`**; their programs are handled outside the provider.

**`sub-agent`** assets use the markdown branch (same as rule-like materialisation) and **`agentDestinationForAsset`** (treated like rules under **`.cursor/rules/`**).

## Checklist

- [x] Rule — markdown write with optional `.mdc` assembly
- [x] Prompt — markdown write to `prompts/`
- [x] Skill — Agent Skills tree: `skills/{skill-name}/SKILL.md` (YAML validate / assemble from `skill.yaml`+`skill.md` / synthesise frontmatter when missing); `{skill_scripts}` → `scripts/`; bundle `{name}` placeholders; extra skill files → `raw_file_copy` under the same skill directory
- [x] Hook — `hooks.json` merge + script copy to `hooks/`
- [x] Mcp — `mcp.json` merge via `mergeMcpJsonDocument`
- [x] Command — markdown components handled; programs via separate path
- [x] Experimental — markdown components handled; programs via separate path
- [x] Multi — delegates to above per-part types

# Code layout

- `src/provider/provider-dtos.ts` — **`ProviderAction`** union: **`plain_markdown_write`**, **`mcp_json_merge`**, **`hooks_json_merge`**, **`raw_file_copy`**, **`delete_managed_file`**; **`AtpProvenance.fragmentKey`** as path under **`layerRoot`**.

- `src/provider/apply-provider-plan.ts` — Sync executor: markdown writes, **`mergeMcpJsonDocument`** + **`formatJsonDocument`** for **`mcp.json`**, **`mergeHooksJsonDocument`** for **`hooks.json`**, raw file copy, managed file delete; takes **`ProviderMergeOptions`**.

- `src/provider/cursor-rule-materialize.ts` — **`trySplitCursorMdcSource`**, **`materializeRuleLikeForCursor`** (delegates to **`assembleCursorMdcContent`** when a **`.mdc`** file matches YAML frontmatter delimiters).

- `src/provider/skill/` — Shared Agent Skills install logic reused by **`CursorAgentProvider`** (and intended for other agents later): normalise/assemble YAML, bundle roots, **`buildSkillInstallProviderActions`**. Barrel: **`index.ts`**. Detail: [2026-04-07-note-standardised-skill-provider](./2026-04-07-note-standardised-skill-provider.md).

- `src/provider/cursor-agent-provider.ts` — **`planInstall`** per staged part (skips **`program`**): all **`type: skill`** rows first → **`buildSkillInstallProviderActions`**; remaining assets follow the JSON / markdown branches. **`planRemove`** deletes one safe relative file; omits **`mcp.json`** / **`hooks.json`** from automated full-file remove. **`SkillFrontmatterError`** from the skill module is wrapped with a **`CursorAgentProvider:`** prefix.

- `src/file-ops/hooks-merge/cursor-hooks-json-merge.ts` — **`mergeHooksJsonDocument`**; append handlers per event with dedupe by **`id`** when present; **`skipConfig`** mirrors MCP skip semantics for hooks.

- `src/file-ops/operation-ids.ts` — Exported literal types for DTOs (**`RuleAssemblyOperationId`**, **`ConfigMergeOperationId`**, etc.).

- `src/file-ops/mcp-merge/mcp-json-helpers.ts` — **`formatJsonDocument`** (shared pretty-print with trailing newline).

- `src/file-ops/mcp-merge/apply-mcp-json-merge.ts` — Imports **`formatJsonDocument`** from helpers (removes duplicate local helper).

- `src/install/rule-only-cursor-provider.ts` — **`usesCursorAgentProviderProjectInstall`** replaces rule-only gate; allows mixed non-program Cursor asset types and program-only packages.

- `src/install/install-package-assets.ts` — Provider path: all **`stagedParts`**, **`providerMergeFromInstallOptions`**, then **`copyProgramAssetsOnly`**. Legacy path: **`copyPackageAssets`** with MCP merge options.

- `src/install/copy-assets.ts` — **`agentDestinationForAsset`** for **`mcp`** → **`mcp.json`**; **`copyMcpAssetToAgent`** for legacy MCP merge; **`copyProgramAssetsOnly`**; **`copyPackageAssets`** optional MCP merge flags. Legacy **`copyPackageAssets`** skill copies still use flat **`skills/<basename>`** (unchanged); Cursor provider path uses **`src/provider/skill/`** layout.

- `src/install/types.ts` — **`PackageAsset.type`** includes **`mcp`**; **`InstallOptions`** **`forceConfig`** / **`skipConfig`**.

- `src/package/catalog-asset-enrichment.ts` — **Mcp** parts (and single-type **mcp**) emit **`type: mcp`** asset rows.

- `src/commands/install.ts` — **`--force-config`**, **`--skip-config`**; mutual exclusion validated before **`installPackage`**.

- `src/remove/remove-safehouse.ts` — Skips unlinking **`mcp`** assets so uninstall does not delete a whole merged **`mcp.json`**.

# Behaviour

### Provider routing

Non-Cursor agents, **station** scope, or **user** **`layerRoot`** still use **`copyPackageAssets`** (with MCP merge options when relevant). Cursor project installs with only supported types use the provider.

### Skills (Cursor provider path)

- Install target: **`.cursor/skills/{name}/SKILL.md`**, where **`{name}`** comes from validated YAML **`name`** or from synthesised / manifest fallback when the staged file has no frontmatter.
- Optional staged files in the same skill bundle (same bundle root as the primary **`skill.*` / `SKILL.md`** files) copy with **`raw_file_copy`**, preserving relative paths under that skill directory.
- Does **not** apply to legacy **`copyPackageAssets`** installs (flat **`skills/`** file copy remains for those code paths).

### MCP and hooks merges

**`forceConfig`** / **`skipConfig`** flow from CLI → **`InstallOptions`** → **`ProviderMergeOptions`** → **`mergeMcpJsonDocument`**. Hooks merge honours **`skipConfig`** only (no force hook conflict mode in this change).

### Uninstall

**`planRemove`** and Safehouse file removal avoid treating **`mcp.json`** as a single owned file for package uninstall; merged config rollback remains a follow-up. Skill uninstall uses **`fragmentKey`** paths such as **`skills/{name}/SKILL.md`** (and sibling files when recorded).

# Tests

See [2026-04-06-test-cursor-agent-provider-and-hooks-merge](./2026-04-06-test-cursor-agent-provider-and-hooks-merge.md). Additional coverage: **`test/provider/skill/skill-standard.test.ts`**, **`test/integration/cursor-agent-provider-skill-install.test.ts`** (build **`dist/`** before CLI integration tests).

# Not in this change

Partial uninstall of **`mcpServers`** or hook handler slices; **station** / **user** layer materialisation for Cursor provider paths; **`Experimental`** / **`Command`** part-specific Cursor layouts (enrichment still maps many components to **`rule`**-like rows). Reusing **`src/provider/skill/`** for Claude / Gemini / Codex **`skills/`** roots is a follow-up (parameterised subdir or parallel planners).

# References

- [2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md)

- [2026-04-06-test-install-pipeline-and-agent-guards](./2026-04-06-test-install-pipeline-and-agent-guards.md)

- [2026-04-06-coding-install-pipeline-dtos-and-agent-guards](./2026-04-06-coding-install-pipeline-dtos-and-agent-guards.md)

- [2026-04-07-note-standardised-skill-provider](./2026-04-07-note-standardised-skill-provider.md)

- [2026-04-06-plan-standardised-skill-support](./2026-04-06-plan-standardised-skill-support.md)
