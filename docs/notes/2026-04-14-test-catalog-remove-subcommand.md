# Test note: `atp catalog remove` subcommand

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

test

## Purpose

Documents automated tests for **`atp catalog remove`** and the **`removeCatalogUserPackage`**
helper. Pairs with
[2026-04-14-coding-catalog-remove-subcommand](./2026-04-14-coding-catalog-remove-subcommand.md).

## Behaviour under test

### Safe package names

**`isSafeCatalogPackageName`** accepts normal names and rejects empty strings, whitespace-only
values, **`..`**, and path separators.

### Removal outcomes

**`removeCatalogUserPackage`** returns structured failure codes for missing Station, missing
catalog file, invalid name, name not in **`packages.user`**, and name only in
**`packages.standard`**.

### Successful user removal

Removes the user row, deletes **`user_packages/<name>/`**, and leaves other user entries
intact.

### Wrapped catalog root

When **`atp-catalog.yaml`** uses a top-level **`catalog:`** key, rewrite keeps that wrapper
after removal.

### CLI integration

**`atp catalog remove`** drops a user package from **`atp catalog list`** output and exits
**1** with a **standard catalog** message when the name exists only under **`standard`**.

## Tests

| File | What it covers |
|------|----------------|
| **`test/package/catalog-remove.test.ts`** | **`isSafeCatalogPackageName`**, **`removeCatalogUserPackage`** (no station, no catalog file, success + dir delete, standard-only, not in user, wrapped YAML). |
| **`test/integration/catalog.test.ts`** | CLI **`catalog remove`** removes **`doc-guide`** from list; standard-only package exits **1** with stderr mentioning the standard catalog. |

## Commands used

- Targeted: **`npm run test:run -- test/package/catalog-remove.test.ts`**

- Targeted: **`npm run test:run -- test/integration/catalog.test.ts`**

- Full gate: **`npm run ci:test`** or **`npm run build`** then **`npm run test:run`**

## Related

- [Coding note](./2026-04-14-coding-catalog-remove-subcommand.md)
