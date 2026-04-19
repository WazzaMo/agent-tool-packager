# Coding note: skill-adjacent programs under `scripts/`

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Implemented the install pipeline change so bundle **`program`** rows that are **skill-adjacent** are installed at **`scripts/<basename>`** next to `SKILL.md` (Agent Skills layout), are omitted from **`copyProgramAssetsOnly`**, and use the same executable-bit policy as bin installs for single-file copies (**`applyProgramExecutableMode`** on **`raw_file_copy`**). Install failures surfaced through **`installPackage`** terminate with exit code **2** (success remains **0**).

A **follow-up classification fix** ensures programs under declared **legacy single-type** bundle directories that contain **no** skill assets (e.g. **`my_tool/`** next to root-only **`SKILL.md`**) are **not** treated as skill-adjacent, so Feature 3 **`exec-pkg`** still receives **`run.sh`** in **`.atp_safehouse/exec-pkg-exec/bin/`**.

## New and touched modules

### `src/provider/skill/skill-adjacent-programs.ts` (new)

- **`collectSkillAdjacentPrograms`** — per part, `type: program` + `part.packagePaths` + **`isProgramPathUnderSkillBundle`**.
- **`collectSkillAdjacentProgramPathsForInstall`** — union of staged POSIX paths to skip in **`copyProgramAssetsOnly`**.
- **`isProgramPathUnderSkillBundle`** — non-empty **`resolveSkillBundleRoot`**: prefix under root as before. **Empty root (legacy):** for **single-type** manifests only, exclude programs under **`bundles[]`** paths that have **no** skill paths under that directory (so **`my_tool/bin/run.sh`** stays a normal **`program`** install). If every skill path is at package root (**`dirname === "."`**), treat **`bin/…`** as skill-adjacent; otherwise require the program to sit under a skill path’s directory tree.

### `src/provider/skill/plan-skill-install.ts`

- **`buildSkillInstallProviderActions`** — optional **`skillAdjacentPrograms`**; occupied destination tracking; **`scripts/`** copies and collision errors; refactored helpers **`pushSkillBundleRawFileCopies`**, **`assertUniqueProgramScriptBasenames`**, **`pushSkillAdjacentProgramRawCopies`** for ESLint complexity.

### `src/provider/provider-plan-common.ts` and agents

- **`appendSkillInstallActions`** receives **`PackageManifest`**, calls **`collectSkillAdjacentPrograms`**, passes programs into the skill planner.
- **Cursor, Claude, Gemini, Codex** providers pass **`this.manifest`**.

### `src/provider/provider-dtos.ts` / `src/provider/apply-provider-plan-base.ts`

- **`RawFileCopyAction.applyProgramExecutableMode`** — after **`copyFileSync`**, calls exported **`chmodProgramAfterCopy`** from **`src/install/copy-package-asset.ts`**.

### `src/install/copy-assets.ts`

- **`copyProgramAssetsOnly`** — optional **`skipProgramPaths?: ReadonlySet<string>`** (POSIX-normalised manifest paths).

### `src/install/install-package-assets.ts`

- Builds **`skipSkillAdjacentPrograms`** via **`collectSkillAdjacentProgramPathsForInstall`** and passes it into every **`copyProgramAssetsOnly`** call on provider install branches.

### `src/install/install.ts` / `src/commands/install.ts`

- **`installPackage`** and caught install failures: **`process.exit(2)`** instead of **1**; Commander install options parse error also **2**.

### `src/provider/skill/index.ts`

- Re-exports skill-adjacent helpers.

## Non-goals (unchanged in this pass)

- **`removeProviderSkillBundleTrees`** — still removes the whole skill directory tree; no separate **`scripts/`** walk added.
- **`{bundle_name}`** / placeholder docs — not changed (plan allowed a later doc pass).

## Risks / limits

- **Multi-type** packages: bundle-without-skill exclusion is not applied (**`isMultiTypeManifest`** skips **`bundleRootsWithoutSkillAssets`**); classification relies on non-empty **`resolveSkillBundleRoot`** from part-prefixed skill paths in typical Multi Skill parts.
- **Legacy empty LCP** with skills only at root: only **`bin/`** subtree programs are skill-adjacent besides root-level programs; other subdirs (e.g. **`patch_tool/`** with only programs) stay **`bin/`** installs unless a future rule ties them to skill rows.
