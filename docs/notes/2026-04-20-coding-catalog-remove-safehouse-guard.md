# Coding note: catalog remove and registered Safehouses

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

coding

## Purpose

Extends **`atp catalog remove`** so dropping a **user** catalog row does not silently strand
projects that still list the package in a **registered** Safehouse manifest. Default removal
refuses when **`atp-safehouse-list.yaml`** points at manifests that still include the name;
optional flags restore or automate the previous behaviour.

Test inventory: [2026-04-20-test-catalog-remove-safehouse-guard](./2026-04-20-test-catalog-remove-safehouse-guard.md).

## CLI surface

| Flag | Role |
|------|------|
| (none) | Refuse with exit **1** when any registered Safehouse **`manifest.yaml`** still lists the package. |
| **`--from-catalog-only`** | Remove the user catalog row (and **`user_packages/<name>/`**) only; same as pre-guard behaviour. |
| **`--and-from-projects`** | For each registered project whose manifest lists the package, run Safehouse removal first, then remove the catalog row. Mutually exclusive with **`--from-catalog-only`**. |

## Modules

| Module | Responsibility |
|--------|----------------|
| **`src/config/load.ts`** | **`loadSafehouseListFromStation(stationPath)`**; **`loadSafehouseList()`** delegates to it. |
| **`src/package/registered-safehouse-package-scan.ts`** | **`sortedProjectBasesWithPackageInRegisteredSafehouses`** scans list paths and manifests. |
| **`src/remove/remove-safehouse.ts`** | **`removeSafehousePackageWithResult`** returns structured failure; **`removeSafehousePackage`** keeps CLI **`process.exit(1)`** behaviour. |
| **`src/package/catalog-remove.ts`** | **`prepareCatalogUserPackageRemoval`** / **`commitPreparedCatalogUserPackageRemoval`**; **`removeCatalogUserPackageWithPolicy`**; extended **`CatalogRemoveResult`** codes; **`catalogRemovePackageCli`** accepts options. |
| **`src/commands/catalog.ts`** | Registers **`--from-catalog-only`** and **`--and-from-projects`** on **`catalog remove`**. |

## Behaviour

### Guard scope

Only Safehouses recorded in **`${STATION_PATH}/atp-safehouse-list.yaml`** are considered
(the same list used for user-bin sharing and station exfiltrate). Projects never registered
after **`atp safehouse init`** are not visible to this guard.

### Order for cascade

**`--and-from-projects`** calls **`removeSafehousePackageWithResult`** while the catalog row
still exists so **`resolvePackage`** can drive agent asset cleanup, then commits catalog
removal.

## Related

- [Test note](./2026-04-20-test-catalog-remove-safehouse-guard.md)
- [2026-04-14-coding-catalog-remove-subcommand](./2026-04-14-coding-catalog-remove-subcommand.md) (original **`catalog remove`**)
- **`src/remove/remove-safehouse.ts`** — catalog lookup during **`remove safehouse`**
