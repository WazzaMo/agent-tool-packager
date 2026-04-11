# Test note: bundle source paths outside the package (`..`, peers)

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

test

## Purpose

This note lists automated tests for **bundle authoring when the bundle directory is not
under the package root**: relative paths that walk out of the package (for example
`../peer-mcp`), absolute paths, and **manifest `path`** behaviour (basename for external
trees). It pairs with the
[coding note for the same change](./2026-04-13-coding-bundle-relative-source-paths.md).

## Behaviour under test

- **Resolution** matches **components**: relative paths resolve from the package working
  directory; absolute paths are normalised.

- **`bundleManifestPath`**: in-package bundles keep a **relative** manifest `path`;
  directories **outside** the package use the directory **basename** (flat staging key,
  analogous to external components).

- **Legacy root `bundleAdd`**: a peer directory reached via `path.relative(pkgDir, peerDir)`
  is accepted; manifest records **`path: <basename>`** and **`stage.tar`** is created or
  updated.

- **Multi-type `package part … bundle add`**: integration flow with a **sibling** bundle
  directory, relative path from the package cwd, **`validate package`** succeeds, and
  YAML contains the expected **`path:`** line.

## Tests

| File | What it covers |
|------|----------------|
| `test/package/resolve-bundle-source.test.ts` | **`resolveBundleSourcePath`**: relative segment from package cwd; absolute normalisation. **`bundleManifestPath`**: `vendor/tool` under package; **`my-mcp`** basename when bundle is under tmp outside pkg. **`isBundleDirectoryUnderPackage`**: true inside pkg; false for peer beside pkg. |
| `test/package/bundle-add.test.ts` | **`adds bundle outside package via relative path; manifest stores basename`**: temp peer with `bin/run`, `bundleAdd(pkgDir, relFromPkg)`, manifest contains `path: <basename>`, `stage.tar` present. |
| `test/integration/feature4-multi-type-packages.test.ts` | **`part bundle add accepts peer directory via path relative to package cwd`**: sibling `peer-mcp-*` with `bin/srv.js`, `atp package part 1 bundle add <rel>`, manifest contains `path: ${peerName}`, `atp validate package` exit **0**, peer dir removed in **`finally`**. |

## Commands used

- Targeted: **`npm run test:run -- test/package/resolve-bundle-source.test.ts`**

- Targeted: **`npm run test:run -- test/package/bundle-add.test.ts`**

- Targeted: **`npm run test:run -- test/integration/feature4-multi-type-packages.test.ts`**

- Full gate: **`npm run ci:test`** (Vite build plus Vitest), because integration tests
  invoke **`dist/atp.js`**.

## Related

- [Coding note](./2026-04-13-coding-bundle-relative-source-paths.md)
