# Test note: catalog skill bundle asset enrichment

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

test

## Purpose

Document unit coverage for **`enrichMultiTypePackageAssets`** / **`enrichSingleTypePackageAssets`**
when a **Skill** part (or single-type **Skill** package) declares **bundles** only: catalog
**`assets`** must list every staged file needed for **`resolvePrimarySkillSource`** and
**`buildSkillInstallProviderActions`**, including **`skip-exec`** bundles where no
**`program`** rows are emitted.

Related coding plan: [2026-04-12-plan-catalog-skill-bundle-asset-enrichment](./2026-04-12-plan-catalog-skill-bundle-asset-enrichment.md).

## Test file

| Path | Role |
|------|------|
| `test/package/catalog-asset-enrichment-skill-bundle.test.ts` | Vitest unit tests for enrichment helpers and full enrich entry points. |

## Cases covered

| Test | Asserts |
|------|---------|
| Multi **Skill** + **`skip-exec`** bundle | **`part_1_Skill/.../skill.yaml`** and **`skill.md`** appear as **`type: skill`**; no **`program`** rows. |
| Multi **Skill** + default exec (**`bin/`**) | **`bin/*.js`** is **`program`** only; yaml/md are **`skill`** (no duplicate path as skill). |
| Components + same-path bundle | Declared **`components`** and bundle walk do not duplicate **`skill.md`** / **`skill.yaml`**. |
| Single-type **Skill** + **`skip-exec`** | **`outManifest`** supplies **`components`** / **`bundles`**; bundle tree yields **`skill`** rows under root-relative paths. |
| **`collectProgramRelPathsSet`** + exec glob | Set matches staged **`part_2_Mcp/.../bin/*`** layout used elsewhere in integration tests. |
| **`appendSkillFilesFromBundleTree`** | Nested **`scripts/tool.sh`** is included so install-time **`raw_file_copy`** can mirror extras. |

## How to run

```bash
npx vitest run test/package/catalog-asset-enrichment-skill-bundle.test.ts
```

Full suite: **`npm run test:run`**.
