# Coding note: bundle sources outside the package (resolution + staging)

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

coding

## Purpose

**Bundles** previously behaved as if the executable tree always lived **inside** the
package. **Components** already allowed **`../…`** and other **cp-like** sources. This
change aligns **bundle authoring** with that model: authors can point at a **peer** or
**parent-relative** directory; the manifest stores a stable **`path`** key and staging
copies the tree into **`stage.tar`**.

Test inventory:
[2026-04-13-test-bundle-relative-source-paths](./2026-04-13-test-bundle-relative-source-paths.md).

## Resolution and manifest `path`

| Function | Module | Role |
|----------|--------|------|
| **`resolveBundleSourcePath`** | `src/package/resolve-bundle-source.ts` | Delegates to **`resolveComponentSourcePath`** (same rules as components). |
| **`bundleManifestPath`** | same | If the bundle directory is **under** `pkgRoot`, returns a **relative** path (forward slashes). If **outside**, returns **`path.basename(bundleDir)`** so archive prefixes stay flat for external trees. |
| **`isBundleDirectoryUnderPackage`** | same | Distinguishes in-package trees from peers (used for legacy tar strategy). |

## Authoring call sites

| Module | Role |
|--------|------|
| `src/package/bundle-add.ts` | Resolves **`execBase`**, computes **`manifestPath`**, validates directory. If **`isBundleDirectoryUnderPackage`**, uses existing in-package **`appendBundleToTar`**; otherwise **`stageFlatBundleTree`** from `stage-multi.ts`. |
| `src/package/bundle-remove.ts` | Resolves the user argument the same way so removal matches manifest rows and tar prefixes **without** requiring the original source directory to still exist on disk. |
| `src/package/part-authoring/bundle.ts` | **`packagePartBundleAdd`** / remove: **`resolveBundleSourcePath`** + **`bundleManifestPath`**; stages with **`stageMultiBundleTree`**. Collision and idempotency use the **manifest** `path` key. |

## Staging

| Function | Module | When used |
|----------|--------|-----------|
| **`stageFlatBundleTree`** | `src/package/stage-multi.ts` | **Legacy** root bundles whose source directory is **outside** `pkgRoot`: copies the tree into a temp layout, then appends to **`stage.tar`** under the manifest basename. |
| **`stageMultiBundleTree`** | `src/package/stage-multi.ts` | **Multi-type** parts: always stages under the part prefix using the computed manifest-relative path (relative or basename). |

## Related

- [Test note](./2026-04-13-test-bundle-relative-source-paths.md)
- [Feature 4 plan](./2026-03-29-plan-feature-4-multi-type-packages.md) (multi-type context)
- [Feature 4 coding](./2026-03-29-coding-feature-4-multi-type-implementation.md)
