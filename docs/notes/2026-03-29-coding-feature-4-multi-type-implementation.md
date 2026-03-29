# Coding note: Feature 4 multi-type packages

(c) Copyright 2026 Warwick Molloy.
Created Mar 29, 2026.

## Purpose

This note summarises the implementation work that added **multi-type package** support (Feature 4), including new tests, CLI behaviour, validation, staging layout, and catalog enrichment, while keeping **legacy single-type** packages working via an explicit `--legacy` skeleton. It also records a later **clean-code / JSDoc** pass across the rest of `src/` (config, catalog, init, install, list/remove, commands, entry).

## New and touched modules

| Category             | Ref |
|----------------------|-----|
| New modules          | (1) |
| Manifest I/O         | (2) |
| Skeleton             | (3) |
| Validate & staging   | (4) |
| Catalog              | (5) |
| Legacy guards        | (6) |
| Summary output       | (7) |
| CLI & entry          | (8) |
| Install (orchestration) | (9) |
| Tests                | (10) |

(1) New under `src/package/`: `manifest-layout.ts`, `part-ops.ts`, `stage-multi.ts`.

(2) `types.ts` (`PackagePart`, `parts`); `load-manifest.ts`; `save-manifest.ts`; `manifest-yaml-serialise.ts` (single vs multi YAML record building).

(3) `create-skeleton.ts`; `package-skeleton.ts` (clear artifacts, write legacy vs multi skeleton manifests).

(4) `validate.ts` (orchestration); `validate-types.ts`; `validate-single-type-package.ts`; `validate-multi-type-package.ts`; `stage-tar-read.ts` (tar listing / path normalisation).

(5) `catalog-add.ts`; `catalog-asset-enrichment.ts` (markdown and bundle program assets aligned with `part_N_Type/` staging).

(6) `root-staging-guard.ts`; `component-add.ts`, `bundle-add.ts`, `component-remove.ts`, `bundle-remove.ts`.

(7) `package-summary.ts`; `package-summary-sections.ts`.

(8) `src/atp.ts`; `src/commands/*.ts` (thin `register*` functions plus small helpers for parsing argv, project-base resolution, and manifest load-or-exit).

(9) `src/install/install.ts`, `reinstall.ts`, `resolve.ts`, `copy-assets.ts`, `types.ts`; **new** `src/install/bundle-path-map.ts` (`buildBundleInstallPathMap` — shared bundle → bin path map for `{bundle_name}` patching, replacing duplicate logic between install and reinstall).

(10) `test/package/create-skeleton.test.ts`, `multi-type-validate.test.ts`; `test/integration/feature4-multi-type-packages.test.ts`; Feature 2 paths use `create package skeleton --legacy` via `package-developer-helpers.ts` and related tests.

## Documentation and clean code (`src/package/`)

After Feature 4 landed, `src/package/` was brought in line with [clean-code.md](../clean-code.md): small composable helpers, names that state intent, and **JSDoc on every function** (exported and internal), including `@param` / `@returns` where applicable.

- **Composition**: Examples include `catalog-asset-enrichment.ts` (helpers such as per-part markdown typing and append helpers for exec globs, unix `bin/`, root bundles, and multi-type aggregation), and clearer orchestration in `part-ops.ts` / `catalog-add.ts` via renamed entry points (e.g. manifest load/validate helpers that `process.exit` on failure).
- **Staging**: `stage-multi.ts` uses a descriptively named tar-append helper (`appendTarEntryFromStagingDir`) with documented behaviour.
- **Manifest parsing**: `load-manifest.ts` adds `coalesceYamlStringList` so YAML list fields that may be a scalar or an array normalise to `string[]` consistently (`normalizeDevManifest`, `parseParts`).
- **Regression check**: `npm run build` and `npm run test:run` were run after each batch; full suite (173 tests at time of writing) stayed green.

## Documentation and clean code (remainder of `src/`)

The same [clean-code.md](../clean-code.md) approach (composition, intent-revealing names, JSDoc on functions including `@param` / `@returns`) was applied across **the rest of `src/`** after `src/package/`, in batches with **build + full `test:run`** after each.

| Area | Examples |
|------|----------|
| **Config** | `paths.ts` (`findProjectBase` split into env override, marker check, upward walk); `load.ts` (`loadYamlFileWhenPresent`); `safehouse-manifest.ts` (`safehouseManifestFilePath`, `writeSafehouseManifestToProject`); JSDoc on `types.ts`, `station-config.ts`, `station-package-manifest.ts`, `safehouse-config.ts`, `agent-path.ts`. |
| **Catalog** | `catalog/load.ts` — JSDoc on `parseCatalogPackageObject`, `resolveCatalogData`, `normalizeLoadedCatalog`, and public list/load helpers. |
| **Init** | `station-init.ts` — `readStationLayoutFlags`, `isStationLayoutComplete`, `ensureStationRootAndManifestDir`, `writeMissingStationYamlFiles`, `logStationInitSummary`. `safehouse-init.ts` — `writeDefaultSafehouseConfigAndManifest`; JSDoc on `toTildePath`, `registerSafehouseInStation`. |
| **Install** | New `bundle-path-map.ts`; JSDoc on `resolve.ts`, `copy-assets.ts`, `install.ts`, `reinstall.ts`, `types.ts`. |
| **List / remove** | `station/list.ts` — `collectStationListRows`, `printStationPackageTable`, `padCell`. `safehouse/list.ts` — `padCell` + docs. `remove/remove-station.ts`, `remove/remove-safehouse.ts` — full JSDoc on helpers and exports. |
| **Commands** | Per-file helpers: e.g. `runValidatePackageCli`, `installOptionsFromCliFlags`, `printStationCatalogList` / `formatCatalogPackageLine`, `runCreatePackageCommand`, `projectBaseForSafehouseList` / `projectBaseForSafehouseRemove`, agent `loadSafehouseConfigOrExit` / `resolveValidatedAgentProjectPath` / `persistAgentSelection`, package `loadDevManifestOrExit` / `dispatchPackagePartCommand`. |
| **Entry** | `atp.ts` — brief module and `program.parse()` note. |

No user-visible CLI behaviour was intended to change in this sweep; **173** tests remained green after the final edits.

## Behaviour changes

### Skeleton and create

- Default `atp create package` / `atp create package [skeleton]` writes `type: Multi` and `parts: []`.
- `atp create package … --legacy` writes empty root `type` for the existing Feature 2 flow.

### Package CLI

- `atp package newpart <keyword>` appends a part; rejects `multi`; warns on duplicate part types; validates existing parts before adding another.
- `atp package part <n> usage <text…>`, `part <n> component <path>`, `part <n> bundle add <dir> [--exec-filter …]` — implemented as one `part` subcommand with `[extra…]` so Commander does not register duplicate `part` commands.
- Root `atp package usage` / `add usage` blocked when root type is Multi.
- `atp package type` extended: `multi`; cannot change root type if `parts` non-empty; empty Multi can switch to a single root type (clears `parts`).

### Staging and validation

- Multi packages stage under `part_{index}_{Type}/…` in `stage.tar` (temp dir + `tar`, no `--transform`).
- `validatePackage` checks Multi constraints, reconciles manifest with tar entries, normalises `./` prefixes from `tar -tf`, warns on duplicate part types when otherwise valid.

### Catalog and install path

- After `catalog add package`, enriched `assets` use the same prefixed paths as the tarball so extraction and `copyPackageAssets` stay aligned.

### Tests

See item (10) under New and touched modules.

## Previously “not done”; now implemented (follow-up)

Relative to **Feature 4 / 0.2.3** ([4-multi-type-packages.md](../features/4-multi-type-packages.md)), the following were implemented in a later pass (tests + clean-code-friendly helpers):

- **Part bundle basename collision:** `wouldBundleBasenameCollideForPartAdd` in `part-bundle-uniqueness.ts`; **exit 2** only when another part already uses the basename; idempotent re-`bundle add` of the same path stays **exit 0**.
- **`part <n> add usage`**, **`part add <type>`** (variadic `package part` command so `add` is not parsed as an index).
- **`part <n> remove`**, **`part <n> component remove`**, **`part <n> bundle remove`** using `stage-tar-mutate.ts` (`mutateStageTarContents`, path helpers).
- **Lists:** `catalog list --verbose`, `station list --extended`, `safehouse list --extended`; type suffix from `catalog/package-type-summary.ts`; **exit 2** on YAML parse errors (catalog verbose, station extended, safehouse manifest load / extended package yaml).
- **Install:** Exported **`installMultiTypeCatalogPackage`** / **`installLegacyCatalogPackage`** with shared **`executeCatalogInstall`**; **`manifestInstallLayout`**; best-effort **rollback** of copied prompt files via `copyPackageAssets` `onFileCopied`; Safehouse row optional **`install_layout`:** `multi` | `legacy`.

## Deliberately not done / follow-ups

- **Product rule (documented in Feature 4):** There is **no** per-part (or per-component / per-bundle) uninstall for packages **after** they are in the catalog and installed. **`install_layout`** on the Safehouse row is metadata only; **`atp remove safehouse` / `atp remove station`** always remove the **whole** package by name using catalog + manifest assets.
- **Atomic install (full):** Rollback covers **files recorded during `copyPackageAssets`** for the current package attempt; dependency recursion and program/bin edge cases are not exhaustively rolled back.

## Version

`npm run build` runs `scripts/sync-version.js`; package version was bumped to **0.2.3** to match the Feature 4 / 0.2.3 specification line.
