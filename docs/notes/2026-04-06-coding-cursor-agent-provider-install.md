# Coding: Cursor agent provider install (rules, skills, MCP, hooks)

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Generalised **Cursor** project installs so **`CursorAgentProvider`** plans and applies **rules** (plain `.md` and assembled `.mdc`), **skills**, **prompts**, **sub-agent** markdown, **`hooks.json`** merge plus hook scripts under **`hooks/`**, and **`mcp.json`** merge via **`mergeMcpJsonDocument`**. **`program`** rows are **not** in the provider plan; **`copyProgramAssetsOnly`** runs after the provider loop. Install routing uses **`usesCursorAgentProviderProjectInstall`** (Cursor + project layer + project prompt scope + only provider-handled asset types or programs). **`InstallOptions`** and **`atp install`** gained **`--force-config`** and **`--skip-config`** for MCP merge behaviour (and hooks skip for config merges).

# Code layout

- `src/provider/provider-dtos.ts` — **`ProviderAction`** union: **`plain_markdown_write`**, **`mcp_json_merge`**, **`hooks_json_merge`**, **`raw_file_copy`**, **`delete_managed_file`**; **`AtpProvenance.fragmentKey`** as path under **`layerRoot`**.

- `src/provider/apply-provider-plan.ts` — Sync executor: markdown writes, **`mergeMcpJsonDocument`** + **`formatJsonDocument`** for **`mcp.json`**, **`mergeHooksJsonDocument`** for **`hooks.json`**, raw file copy, managed file delete; takes **`ProviderMergeOptions`**.

- `src/provider/cursor-rule-materialize.ts` — **`trySplitCursorMdcSource`**, **`materializeRuleLikeForCursor`** (delegates to **`assembleCursorMdcContent`** when a **`.mdc`** file matches YAML frontmatter delimiters).

- `src/provider/cursor-agent-provider.ts` — **`planInstall`** per staged part (skips **`program`**); **`planRemove`** deletes one safe relative file; omits **`mcp.json`** / **`hooks.json`** from automated full-file remove.

- `src/file-ops/hooks-merge/cursor-hooks-json-merge.ts` — **`mergeHooksJsonDocument`**; append handlers per event with dedupe by **`id`** when present; **`skipConfig`** mirrors MCP skip semantics for hooks.

- `src/file-ops/operation-ids.ts` — Exported literal types for DTOs (**`RuleAssemblyOperationId`**, **`ConfigMergeOperationId`**, etc.).

- `src/file-ops/mcp-merge/mcp-json-helpers.ts` — **`formatJsonDocument`** (shared pretty-print with trailing newline).

- `src/file-ops/mcp-merge/apply-mcp-json-merge.ts` — Imports **`formatJsonDocument`** from helpers (removes duplicate local helper).

- `src/install/rule-only-cursor-provider.ts` — **`usesCursorAgentProviderProjectInstall`** replaces rule-only gate; allows mixed non-program Cursor asset types and program-only packages.

- `src/install/install-package-assets.ts` — Provider path: all **`stagedParts`**, **`providerMergeFromInstallOptions`**, then **`copyProgramAssetsOnly`**. Legacy path: **`copyPackageAssets`** with MCP merge options.

- `src/install/copy-assets.ts` — **`agentDestinationForAsset`** for **`mcp`** → **`mcp.json`**; **`copyMcpAssetToAgent`** for legacy MCP merge; **`copyProgramAssetsOnly`**; **`copyPackageAssets`** optional MCP merge flags.

- `src/install/types.ts` — **`PackageAsset.type`** includes **`mcp`**; **`InstallOptions`** **`forceConfig`** / **`skipConfig`**.

- `src/package/catalog-asset-enrichment.ts` — **Mcp** parts (and single-type **mcp**) emit **`type: mcp`** asset rows.

- `src/commands/install.ts` — **`--force-config`**, **`--skip-config`**; mutual exclusion validated before **`installPackage`**.

- `src/remove/remove-safehouse.ts` — Skips unlinking **`mcp`** assets so uninstall does not delete a whole merged **`mcp.json`**.

# Behaviour

### Provider routing

Non-Cursor agents, **station** scope, or **user** **`layerRoot`** still use **`copyPackageAssets`** (with MCP merge options when relevant). Cursor project installs with only supported types use the provider.

### MCP and hooks merges

**`forceConfig`** / **`skipConfig`** flow from CLI → **`InstallOptions`** → **`ProviderMergeOptions`** → **`mergeMcpJsonDocument`**. Hooks merge honours **`skipConfig`** only (no force hook conflict mode in this change).

### Uninstall

**`planRemove`** and Safehouse file removal avoid treating **`mcp.json`** as a single owned file for package uninstall; merged config rollback remains a follow-up.

# Tests

See [2026-04-06-test-cursor-agent-provider-and-hooks-merge](./2026-04-06-test-cursor-agent-provider-and-hooks-merge.md).

# Not in this change

Partial uninstall of **`mcpServers`** or hook handler slices; **station** / **user** layer materialisation for Cursor provider paths; **`Experimental`** / **`Command`** part-specific Cursor layouts (enrichment still maps many components to **`rule`**-like rows).

# References

- [2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md)

- [2026-04-06-test-install-pipeline-and-agent-guards](./2026-04-06-test-install-pipeline-and-agent-guards.md)

- [2026-04-06-coding-install-pipeline-dtos-and-agent-guards](./2026-04-06-coding-install-pipeline-dtos-and-agent-guards.md)
