# Plan: Align `StagedPartInstallInput` with the install pipeline

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Context

Feature 5 now documents a proposed **`AgentProvider`** contract in
[5-installer-providers-for-known-agents](../features/5-installer-providers-for-known-agents.md#software-design-strategy).
**`planInstall`** takes **`InstallContext`** (from the internal DTO note) and a
**`StagedPartInstallInput`** placeholder: **`partKind`**, **`partIndex`**, and
**`stagingRelPaths`** under **`InstallContext.stagingDir`**.

The next implementation step (wiring providers into **`atp install`**) needs a
**single, typed** “one part ready to plan/apply” object shared by:

- install orchestration (`src/install/install.ts` and friends);

- **`AgentProvider.planInstall`** / tests;

- optional manifest validation before planning.

Today, multi-part installs use **`CatalogInstallContext`** and a manifest whose
**`parts`** entries are **`Array<Record<string, unknown>>`** in
`src/install/types.ts`, so the gap is intentional: strong typing and field names
for **`StagedPartInstallInput`** are still to be chosen and documented.

# Goals

- Replace the placeholder with a type (or small set of variants) that the install
  pipeline can construct without ad hoc casting.

- Map cleanly onto **`ProviderPlan`** / **`ProviderAction`** and provenance
  (**`partIndex`**, **`partKind`**, **`fragmentKey`**) per
  [2026-04-03-plan-provider-internal-dtos](./2026-04-03-plan-provider-internal-dtos.md).

- Keep **Feature 5** and this note in sync once the shape is stable.

# Proposed work (pick up in order)

1. **Inventory the real “part” shape during install**

   - Trace **`installMultiTypeCatalogPackage`** (and any extract/staging step) to
     see what exists on disk per part before copy or merge.

   - List what **`AgentProvider`** needs beyond paths: declared **type** string
     from YAML, component paths, bundle hints, etc.

2. **Introduce a typed manifest slice for `parts`**

   - Prefer a **`PackagePart`** (name TBD) interface in `src/install/types.ts`
     (or `src/provider/types.ts` if you want provider-facing types separate from
     raw YAML).

   - Align field names with **`atp-package.yaml`** / Feature 4 authoring docs
     so errors stay author-friendly.

3. **Define `StagedPartInstallInput` (or rename) in code**

   - Fields should reference **`PartKind`** (internal DTO / **`operation-ids`**
     alignment) and **`partIndex`** (1-based or 0-based — match existing CLI and
     **`atp package part`** conventions).

   - **`stagingRelPaths`**: confirm whether this is “all component files for
     this part”, “roots only”, or replaced by explicit **`components`** entries
     with **`relPath` + role** (rule body vs yaml sidecar).

4. **Build `InstallContext` from existing config**

   - Today **`CatalogInstallContext`** carries **`projectBase`**, **`agentBase`**,
     **`pkgDir`**, **`manifest`**, **`opts`**, etc.

   - Specify how **`layerRoot`**, **`stagingDir`**, and **`layer`** map from
     Safehouse config and the temp extract directory (project-only v1 is fine).

5. **Update the Feature 5 TypeScript snippet**

   - Replace the placeholder **`StagedPartInstallInput`** block with the real
     type name and fields, or add a “see `src/...`” reference if the doc should
     stay short.

6. **Add tests**

   - Unit: construct **`StagedPartInstallInput`** (or factory) from a fixture
     manifest and assert **`planInstall`** receives expected paths.

   - Integration (later): one **`atp install`** path with a multi-part fixture
     once **`AgentProvider`** is wired.

# Open questions

- Should **`StagedPartInstallInput`** live next to **`PackageManifest`** or under
  **`src/provider/`** to avoid install↔provider cycles?

ANSWER: `src/provider` should be reserved for provider types, like AgentProviders
        and these types are part of the file operation, so they should be under
        `src/file-ops` as a directory and logical namespace.

- Do we pass **pre-resolved absolute paths** for some files instead of only
  **`stagingRelPaths`** to reduce path bugs in providers?

ANSWER: We need to strengthen the conceptual separation between AgentProviders
        and file operations.


- How do **legacy** single-part manifests (no **`parts`**) map to a synthetic
  **`partIndex`** and **`partKind`** for **`planInstall`**?

# Definition of done

- A checked-in **TypeScript type** (and parser/normaliser if needed) used by
  install orchestration for each part iteration.

- **Feature 5** proposal section updated so the doc matches the type (no
  divergent placeholder).

- At least one **unit test** proving a fixture manifest round-trips into the
  provider input shape.


# References

| Topic | Location |
|-------|----------|
| Agent provider proposal | [Feature 5 — Software design strategy](../features/5-installer-providers-for-known-agents.md#software-design-strategy) |
| DTOs (`InstallContext`, `ProviderPlan`) | [2026-04-03-plan-provider-internal-dtos](./2026-04-03-plan-provider-internal-dtos.md) |
| Install orchestration | `src/install/install.ts`, **`CatalogInstallContext`** |
| Manifest types | `src/install/types.ts` (**`parts`** today) |
| File operations checklist | [2026-04-03-plan-provider-capability-matrix](./2026-04-03-plan-provider-capability-matrix.md#implementation-checklist) |
