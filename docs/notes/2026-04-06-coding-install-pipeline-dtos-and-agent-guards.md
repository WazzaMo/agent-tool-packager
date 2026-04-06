# Coding note: install pipeline DTOs and agent provider alignment

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

kind: coding

Summary of **new and changed application source** added while wiring the install path toward Feature 5 **AgentProvider** contracts: staged part inputs, provider **InstallContext**, home-path resolution, and CLI enforcement that only supported agents may be assigned.

# New modules

## `src/file-ops/part-install-input.ts`

- **`PartKind`** / **`PartInstallInput`**: progressive handle for one package part (relative vs absolute paths).
- **`StagedPartInstallInput`**: `packagePaths` relative to extract root; private staging rel paths + **`getStagingDir()`**.
- **`ResolvedInstallInput`**: absolute paths; **`fromAbsolutePaths`** with count check.
- **`coercePackageParts`**: normalises YAML **`parts`** at the install boundary.
- **`normalisePartKind`**: canonical Feature 2 kinds; throws on unknown strings.
- **`buildStagedPartInstallInputs`**: multi layout groups **`manifest.assets`** by **`part_N_Type`** via **`partStagePrefix`**; legacy layout synthesises **partIndex 1** from root **`type`** (falls back to **`Skill`** when **`type`** empty or **`Multi`**).
- **`resolveStagedPartToAbsolute`**: joins staging root for default resolution before agent-specific layout.

## `src/file-ops/install-context.ts`

- **`PROVIDER_AGENT_IDS`**: single source of truth for agents that have (or will have) an **AgentProvider**.
- **`AgentId`**, **`InstallLayer`**, **`InstallContext`**: match internal DTO note (roots + agent + layer).
- **`isProviderAgentId`**: case-insensitive membership test.
- **`normaliseAgentId`**: returns canonical **`AgentId`** or **throws** with supported list (no silent **`cursor`** fallback).

# Changed modules

## `src/install/types.ts`

- **`PackageManifest.type`**: optional root type (legacy / **`Multi`**).
- **`PackageManifest.parts`**: typed as **`PackagePart[]`** (from **`src/package/types.js`**) instead of **`Record<string, unknown>[]`**.

## `src/install/install.ts`

- **`manifestInstallLayout`**: uses **`coercePackageParts`** so empty / malformed **`parts`** do not count as multi.
- **`prepareCatalogInstallPartInputs`**: thin wrapper over **`buildStagedPartInstallInputs(manifest, pkgDir)`**.
- **`buildProviderInstallContext`**: loads Safehouse + Station; sets **`agent`**, **`layer`** (**project** vs **user** from **`promptScope`**), **`projectRoot`**, **`layerRoot`** (**`agentBase`** vs **`resolveAgentHomePath`**), **`stagingDir`** (**`pkgDir`**). JSDoc notes **`--station`** copy still targets project **`agentBase`** today while **`layerRoot`** may point at user home for future merges.
- **`executeCatalogInstall`**: builds provider context, asserts absolute paths and **`stagingDir`/`projectRoot`** consistency; multi layout asserts staged part count matches **`parts`** length.

## `src/config/agent-path.ts`

- **`resolveAgentHomePath`**: absolute agent home from Station **`home_path`** or **`DEFAULT_AGENT_PATHS`**; safe **`~/…`** expansion (avoids joining home with an absolute second segment); strips trailing separators for stable paths.

## `src/commands/agent.ts`

- **`normaliseAgentIdForCli`**: provider check with **`process.exit(1)`** on unsupported name.
- **`canonicalProviderAgentOrNull`**: interprets existing Safehouse **`agent`** for idempotent **`atp agent`** when legacy value is not provider-supported.
- **`agent`** / **`handover`**: persist **canonical** lowercase **`AgentId`**; Station validation runs **after** provider validation.

# Design links

| Topic | Location |
|-------|----------|
| Staged part plan | `docs/notes/2026-04-05-plan-align-staged-part-install-input.md` |
| Provider DTOs | `docs/notes/2026-04-03-plan-provider-internal-dtos.md` |
| Feature 5 surface | `docs/features/5-installer-providers-for-known-agents.md` |
| Tests for this work | `docs/notes/2026-04-06-test-install-pipeline-and-agent-guards.md` |

# Follow-up (not done here)

- Implement **`AgentProvider`** registry and **`planInstall` / `applyPlan`** using **`InstallContext`** + **`StagedPartInstallInput`**.
- Optionally align **`--station`** materialisation with **`layer`** **`user`** when user-global install is implemented end-to-end.
