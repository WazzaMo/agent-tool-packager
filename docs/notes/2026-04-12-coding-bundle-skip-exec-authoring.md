# Coding note: bundle `--skip-exec` for data-only trees

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

coding

## Purpose

Authoring previously required either a **`bin/`** directory under the bundle or
**`--exec-filter`** so catalog enrichment could register **`program`** assets. Some MCP
(or other) bundles are configuration-only. This change adds **`--skip-exec`** so authors
can register and stage those trees without inventing a fake glob.

Test inventory: [2026-04-12-test-bundle-skip-exec-authoring](./2026-04-12-test-bundle-skip-exec-authoring.md).

## CLI surface

| Command | New option |
|---------|------------|
| `atp package part … bundle add <dir>` | **`--skip-exec`** (same command as **`--exec-filter`**) |
| `atp package bundle add <dir>` | **`--skip-exec`** |

**`--skip-exec`** and **`--exec-filter`** are mutually exclusive; both set exits **1**
with a fixed error string.

## Manifest shape

| Field | Meaning |
|-------|---------|
| **`skip-exec: true`** | On the bundle object next to **`path`**; no **`exec-filter`**. |
| Absent | Existing rules: default **`path/bin/*`** when **`bin/`** exists, else require **`exec-filter`**. |

**`BundleDefinition`** in **`src/package/types.ts`** gained optional **`"skip-exec"`**.
Load paths normalise the flag in **`load-manifest.ts`** and **`part-install-input.ts`**
(coerce YAML boolean).

## Catalog enrichment

**`src/package/catalog-asset-enrichment.ts`** skips **`appendProgramAssetsForBundleRoot`**
when **`skip-exec`** is true (root bundles and per-part bundles). The bundle directory
still appears in **`stage.tar`** as before; only **`program`** rows are omitted from
**`assets`**.

## Core authoring implementations

| Module | Role |
|--------|------|
| `src/package/part-authoring/bundle.ts` | **`packagePartBundleAdd`**: validation, mutual exclusion, **`{ path, skip-exec: true }`** vs exec-filter default. |
| `src/package/bundle-add.ts` | Legacy **`bundleAdd`**: same rules for root **`bundles`**. |
| `src/commands/package-cmd/register-type-part.ts` | **`--skip-exec`** on **`package part`**; passes **`PartBundleCliOpts`** into dispatch. |
| `src/commands/package-cmd/register-component-bundle.ts` | **`--skip-exec`** on **`package bundle add`**; mutual exclusion before **`bundleAdd`**. |
| `src/commands/package-cmd/part-dispatch.ts` | **`PartBundleCliOpts`**; help text mentions **`--skip-exec`**. |
| `src/install/types.ts` | Catalog **`bundles`** typing allows **`skip-exec`** on objects. |

## Related

- [Test note](./2026-04-12-test-bundle-skip-exec-authoring.md)
