# Coding note: install pipeline DTOs and agent provider alignment

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

**Kind:** coding

Summary of **new and changed application source** added while wiring the install path toward Feature 5 **AgentProvider** contracts: staged part inputs, provider **InstallContext**, home-path resolution, and CLI enforcement that only supported agents may be assigned.

# New modules

## `src/file-ops/part-install-input.ts`

### Part kind and progressive install input

**`PartKind`** and **`PartInstallInput`** model one package part as paths move from relative staging to absolute targets.

### Staged part shape

**`StagedPartInstallInput`** keeps **`packagePaths`** relative to the extract root, private staging-relative paths, and **`getStagingDir()`**.

### Resolved part shape

**`ResolvedInstallInput`** holds absolute paths, including **`fromAbsolutePaths`** with a count check.

### Manifest **`parts`** coercion

**`coercePackageParts`** normalises YAML **`parts`** at the install boundary. **`normalisePartKind`** maps to canonical Feature 2 kinds and throws on unknown strings.

### Building staged inputs from the manifest

**`buildStagedPartInstallInputs`** groups **`manifest.assets`** by **`part_N_Type`** via **`partStagePrefix`** for multi layout; legacy layout synthesises **partIndex 1** from the root **`type`** (falls back to **`Skill`** when **`type`** is empty or **`Multi`**).

### Default resolution before provider layout

**`resolveStagedPartToAbsolute`** joins the staging root for default resolution before agent-specific layout runs.

## `src/file-ops/install-context.ts`

### Provider agent set

**`PROVIDER_AGENT_IDS`** is the single list of agents that have (or will have) an **`AgentProvider`**.

### Core context types

**`AgentId`**, **`InstallLayer`**, and **`InstallContext`** match the internal DTO note (roots, agent, layer).

### Agent id helpers

**`isProviderAgentId`** is a case-insensitive membership test. **`normaliseAgentId`** returns a canonical **`AgentId`** or throws with the supported list (no silent **`cursor`** fallback).

# Changed modules

## `src/install/types.ts`

### Manifest typing

**`PackageManifest.type`** is an optional root type (legacy or **`Multi`**). **`PackageManifest.parts`** is **`PackagePart[]`** (from **`src/package/types.js`**) instead of **`Record<string, unknown>[]`**.

## `src/install/install.ts`

### Layout and part preparation

**`manifestInstallLayout`** uses **`coercePackageParts`** so empty or malformed **`parts`** do not count as multi. **`prepareCatalogInstallPartInputs`** is a thin wrapper over **`buildStagedPartInstallInputs(manifest, pkgDir)`**.

### Provider install context at catalog time

**`buildProviderInstallContext`** loads Safehouse and Station, then sets **`agent`**, **`layer`** (**project** vs **user** from **`promptScope`**), **`projectRoot`**, **`layerRoot`** (**`agentBase`** vs **`resolveAgentHomePath`**), and **`stagingDir`** (**`pkgDir`**). JSDoc notes **`--station`** copy still targets project **`agentBase`** today while **`layerRoot`** may point at the user home for future merges.

### Execute path

**`executeCatalogInstall`** builds provider context, asserts absolute paths and **`stagingDir`/`projectRoot`** consistency, and for multi layout asserts staged part count matches **`parts`** length.

## `src/config/agent-path.ts`

### Agent home resolution

**`resolveAgentHomePath`** resolves an absolute agent home from Station **`home_path`** or **`DEFAULT_AGENT_PATHS`**, expands **`~/…`** safely (avoids joining home with an absolute second segment), and strips trailing separators for stable paths.

## `src/commands/agent.ts`

### CLI normalisation and exit behaviour

**`normaliseAgentIdForCli`** enforces the provider list and **`process.exit(1)`** on unsupported names.

### Idempotent agent when legacy value is unsupported

**`canonicalProviderAgentOrNull`** interprets an existing Safehouse **`agent`** so **`atp agent`** stays idempotent when the stored value is not provider-supported.

### Persisting agent and handover

**`agent`** and **`handover`** persist a canonical lowercase **`AgentId`**; Station validation runs **after** provider validation.

# Design links

| Topic | Location |
|-------|----------|
| Staged part plan | `docs/notes/2026-04-05-plan-align-staged-part-install-input.md` |
| Provider DTOs | `docs/notes/2026-04-03-plan-provider-internal-dtos.md` |
| Feature 5 surface | `docs/features/5-installer-providers-for-known-agents.md` |
| Tests for this work | `docs/notes/2026-04-06-test-install-pipeline-and-agent-guards.md` |

# Follow-up (not done here)

## AgentProvider registry and apply path

Implement an **`AgentProvider`** registry and **`planInstall` / `applyPlan`** using **`InstallContext`** plus **`StagedPartInstallInput`**.

## Station scope and user layer

Optionally align **`--station`** materialisation with **`layer`** **`user`** when user-global install is implemented end-to-end.
