# Test note: catalog remove and registered Safehouses

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

test

## Purpose

Documents automated tests for catalog removal when **`atp-safehouse-list.yaml`** references
project Safehouses, and for the **`sortedProjectBasesWithPackageInRegisteredSafehouses`**
helper. Pairs with
[2026-04-20-coding-catalog-remove-safehouse-guard](./2026-04-20-coding-catalog-remove-safehouse-guard.md).

## Behaviour under test

### Registered manifest scan

**`sortedProjectBasesWithPackageInRegisteredSafehouses`** returns sorted unique project roots
whose manifests list the package, skips missing Safehouse directories, and returns an empty
list when the list file is absent.

### Policy helper

**`removeCatalogUserPackageWithPolicy`** (unit):

- Default mode returns **`still_in_registered_safehouses`** when a listed manifest still
  contains the package.

- **`fromCatalogOnly`** removes the user catalog row while the manifest row remains.

- Both flags set returns **`conflicting_catalog_remove_options`**.

- **`andFromProjects`** removes the manifest entry then the catalog row; success includes
  **`removedFromProjectBases`**.

### CLI integration

**`atp catalog remove`** without flags exits **1** when a registered manifest lists the
package; stderr mentions **`--and-from-projects`** and project roots.

**`--from-catalog-only`** succeeds in that situation.

**`--from-catalog-only`** together with **`--and-from-projects`** exits **1** with a mutually
exclusive message.

**`--and-from-projects`** after a real **`install --project`** clears the Safehouse manifest
and drops the user catalog row.

### Station list loader

**`loadSafehouseListFromStation`** resolves paths from a given Station root without relying
on **`STATION_PATH`** for the test call site.

## Tests

| File | What it covers |
|------|----------------|
| **`test/package/registered-safehouse-package-scan.test.ts`** | Scan: two projects, missing dir, missing list file. |
| **`test/package/catalog-remove.test.ts`** | Policy outcomes and **`andFromProjects`** end state (manifest + catalog). |
| **`test/config/load.test.ts`** | **`loadSafehouseListFromStation`** reads YAML paths. |
| **`test/integration/catalog.test.ts`** | CLI refuse, **`--from-catalog-only`**, conflicting flags, **`--and-from-projects`** install flow. |

## Pass rate

Full **`npm run test:run`** gate passes with these cases included (suite size grows with the
repo; run locally for the current count).

## Commands used

- Targeted: **`npm run test:run -- test/package/registered-safehouse-package-scan.test.ts`**

- Targeted: **`npm run test:run -- test/package/catalog-remove.test.ts`**

- Targeted: **`npm run test:run -- test/integration/catalog.test.ts`**

- Full gate: **`npm run build`** then **`npm run test:run`**

## Related

- [Coding note](./2026-04-20-coding-catalog-remove-safehouse-guard.md)
