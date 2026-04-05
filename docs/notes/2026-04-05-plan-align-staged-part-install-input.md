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
     (or `src/file-ops/types.ts` if you want staging / file-op DTOs separate from
     raw YAML).

   - Align field names with **`atp-package.yaml`** / Feature 4 authoring docs
     so errors stay author-friendly.

3. **Define `PartInstallInput` interface and classes that implement it in code**

   - Fields should reference **`PartKind`** (internal DTO / **`operation-ids`**
     alignment) and **`partIndex`** (1-based — match existing CLI and
     **`atp package part`** conventions).

     See [Feature 5 specification section "Proposed `AgentProvider` surface (TypeScript)"](../features/5-installer-providers-for-known-agents.md#proposed-agentprovider-surface-typescript)
     where the `PartInstallInput` interface, the `StagedPartInstallInput` class
     and the `ResolvedInstallInput` class are discussed to implement a progressive
     installation path resolution algorithm that allows the AgentProvider to play
     a role in resolving the final installation path.

4. **Build `InstallContext` from existing config**

   - Today **`CatalogInstallContext`** carries **`projectBase`**, **`agentBase`**,
     **`pkgDir`**, **`manifest`**, **`opts`**, etc.

   - Specify how **`layerRoot`**, **`stagingDir`**, and **`layer`** map from
     Safehouse config and the temp extract directory (project-only v1 is fine).

5. **Update the Feature 5 TypeScript snippet**

   - Implement the full path resolution pipeline with the `PartInstallInput` interface,
     the `StagedPartInstallInput` class and the `ResolvedInstallInput` class
     populated by the AgentProvider.

6. **Add tests**

   - Unit: construct **`StagedPartInstallInput`** (or factory) from a fixture
     manifest and assert **`planInstall`** receives expected paths.

   - Integration (later): one **`atp install`** path with a multi-part fixture
     once **`AgentProvider`** is wired.

# Open questions

- Should **`StagedPartInstallInput`** live next to **`PackageManifest`** or under
  **`src/file-ops/`** to avoid install↔provider cycles?

ANSWER: **`PartInstallInput`** is an interface that represents a progressive data
        transformation pipeline from staged paths coming from the Package structure
        and being resolved by the AgentProvider implementation to absolute paths,
        so that the installation is fully informed.
        The types relating to this are part of the file-ops namespace
        because they provide input data as part of the file-operation DTOs and therefore must live
        under **`src/file-ops/`**, alongside merge engines, rule assembly, and
        **`operation-ids.ts`**. The **`AgentProvider`** contracts and per-agent
        implementations are intended for **`src/provider/`**.

- Do we pass **pre-resolved absolute paths** for some files instead of only
  **`stagingRelPaths`** to reduce path bugs in providers?

ANSWER: The AgentProvider instance should pass pre-resolved, absolute paths.

DONE:   We need to strengthen the conceptual separation between AgentProviders
        and file operations. This has been done by refactoring what WAS `src/provider`
        to `src/file-ops`.

- How do **legacy** single-part manifests (no **`parts`**) map to a synthetic
  **`partIndex`** and **`partKind`** for **`planInstall`**?

ANSWER: Assuming file-ops functions do not depend on different behaviour for legacy
        packages, compared to the new format, then a legacy, single-part package
        can pass the same values that a modern, multi-part package with only one part
        would provide. That is, the partIndex = 1 for legacy, single-type packages;
        the partKind = the package's type.
        NOTE: partIndex is 1-based everywhere, for all packages.

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
| File-operation engines (`operation-ids`, merge, rule assembly) | `src/file-ops/` |
