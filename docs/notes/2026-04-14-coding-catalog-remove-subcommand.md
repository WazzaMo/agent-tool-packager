# Coding note: `atp catalog remove` subcommand

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

coding

## Purpose

Adds **`atp catalog remove <package-name>`** so authors can drop a **user** catalog package
from the Station without hand-editing **`atp-catalog.yaml`** and **`user_packages/`**.
Standard catalog rows (**`packages.standard`**) are intentionally not removed here; the
CLI exits **1** with guidance when the name exists only in the standard list.

Test inventory: [2026-04-14-test-catalog-remove-subcommand](./2026-04-14-test-catalog-remove-subcommand.md).

## CLI surface

| Command | Role |
|---------|------|
| **`atp catalog remove <package>`** | Remove matching row from **`packages.user`**, rewrite **`atp-catalog.yaml`**, delete **`user_packages/<name>/`** when present. |

## Modules

| Module | Responsibility |
|--------|----------------|
| **`src/package/catalog-remove.ts`** | **`removeCatalogUserPackage(stationPath, name)`** (pure outcome for tests), **`catalogRemovePackageCli`**, **`isSafeCatalogPackageName`** (rejects path segments and **`..`**). |
| **`src/commands/catalog.ts`** | Registers **`remove <package>`** on the **`catalog`** command group. |

## Behaviour

- Loads and rewrites **`atp-catalog.yaml`** using the same root shape rules as
  **`catalog-add`** (**`catalog:`** wrapper preserved when present); uses
  **`parseCatalogPackagesField`** then splices the user entry by **`name`** (trimmed).

- Deletes **`user_packages/<name>/`** under the Station when that directory exists (same
  constant layout as **`src/package/catalog-add.ts`**).

- Errors without mutating when: Station missing, invalid name, catalog file missing, name
  absent from **`packages.user`**, or name listed only under **`packages.standard`**.

## Related

- [Test note](./2026-04-14-test-catalog-remove-subcommand.md)
- **`src/package/catalog-add.ts`** — user catalog publish path this command reverses for **`user_packages/`** and **`packages.user`**
- [Feature 2 — Package developer support](../features/2-package-developer-support.md) (**`atp catalog add package`**)
