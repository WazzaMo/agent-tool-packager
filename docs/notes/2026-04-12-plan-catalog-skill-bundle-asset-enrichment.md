# Coding plan: skill bundle catalog asset enrichment

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Kind

plan

## Goal

When a **Skill** is authored as a **bundle directory** (for example **`skill.yaml`** +
**`skill.md`** partials under **`doc-writing/`**), **`atp catalog add package`** must
write **`assets`** rows with **`type: skill`** for those files so install providers
partition them into the part and **`buildSkillInstallProviderActions`** runs.

Previously, Multi enrichment only added **`skill`** (or other markdown) rows from
**`parts[].components`** and **`program`** rows from bundle exec rules; **`skip-exec`**
skipped the entire bundle branch, so bundle-only skills produced **no** skill assets and
nothing under **`.cursor/skills/`** after install.

Test inventory: [2026-04-12-test-catalog-skill-bundle-asset-enrichment](./2026-04-12-test-catalog-skill-bundle-asset-enrichment.md).

## What changed

| Area | Change |
|------|--------|
| **`skip-exec`** | Applies only to **program** discovery (**`collectProgramRelPathsSet`** /
**`appendProgramAssetsForBundleRoot`**). The bundle directory is still processed for
**Skill** file discovery. |
| **Multi parts** | For each **`parts[]`** bundle, if **`part.type`** is **Skill** (case-insensitive),
recursively list **files** under **`part_N_Type/<bundle>/`** and append **`type: skill`**
rows unless the path is a declared **program** or already seen (components or prior rows). |
| **Single-type Skill** | Same walk for root **`bundles`** in **`enrichSingleTypePackageAssets`**
( **`outManifest.bundles`** ), after **component** rows. |
| **Programs** | **`appendProgramAssetsForBundleRoot`** now delegates to
**`collectProgramRelPathsSet`** so program paths and skill walk exclusions stay aligned. |

## Modules

| Module | Responsibility |
|--------|------------------|
| **`src/package/catalog-asset-enrichment.ts`** | **`collectProgramRelPathsSet`**,
**`appendSkillFilesFromBundleTree`**, updated **`appendMultiTypeMarkdownAndBundleAssets`**,
**`enrichSingleTypePackageAssets`**, refactored **`appendProgramAssetsForBundleRoot`**. |

## Validation and install (unchanged contract)

- **Authoring** validation still requires staged trees to match **`components`** and
**`bundles`** declarations; enrichment does not relax disk checks.
- **Install-time** skill rules (**`resolvePrimarySkillSource`**) are unchanged: invalid
combinations (for example multiple ambiguous **`.md`** files without **`SKILL.md`** or
**`skill.yaml` + `skill.md`**) still **throw** during provider planning.

## Limitations and caveats

| Topic | Limitation |
|-------|------------|
| **One skill tree per Skill part** | All **`type: skill`** assets under one **Skill** part are passed to a **single** **`buildSkillInstallProviderActions`** call. **Two sibling bundles** each with their own **`skill.yaml` + `skill.md`** can produce **multiple markdown sources** and fail resolver rules. Authors should use **one bundle root** (or one logical tree) per **Skill** part, or split into **multiple Skill parts**. |
| **Non-skill parts** | **Mcp**, **Rule**, etc. do **not** gain **`skill`** rows from bundle walks; only **`part.type`** **Skill** triggers the walk. |
| **File coverage** | Every **regular file** under the bundle is registered as **`skill`** except paths in the **program** set. Binaries under **`bin/`** when programs are discovered are **programs** only; with **`skip-exec`**, **`bin/`** files are included as **`skill`** (may be desired for scripts shipped next to YAML/md). |
| **Symlinks and specials** | Walk uses **`withFileTypes: true`** and only treats **normal files**; symlinks and unusual node types are skipped (not copied via this enrichment path). |
| **Catalog refresh** | Existing **`user_packages/<name>/atp-package.yaml`** is not rewritten until **`atp catalog add package`** is run again from source. |
| **Single-type manifest split** | **`enrichSingleTypePackageAssets`** reads **`components`** and **`bundles`** from **`outManifest`** (YAML body on disk), not only **`DevPackageManifest`**; tooling must keep **`outManifest`** aligned with **`atp-package.yaml`** when testing or scripting. |

## Related notes

- [2026-04-12-coding-bundle-skip-exec-authoring](./2026-04-12-coding-bundle-skip-exec-authoring.md)
  ( **`--skip-exec`** authoring); the **Catalog enrichment** bullet there described **program**
  skipping only—**Skill** bundle walks are additive on top of that behaviour.
