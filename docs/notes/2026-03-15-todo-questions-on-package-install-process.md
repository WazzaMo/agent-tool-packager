# Todo: Questions and gaps in Package Install Process

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created 2026-03-15.
Updated 2026-03-16, 2026-03-17.

---------------------------------------------------------------------------

## Updates (2026-03-17, continued)

### Program asset / bundle executable installation

- **Bundle executables:** Implemented. Program assets from package manifest are copied to the install bin directory: `~/.local/bin` (user-bin) or `.atp_safehouse/{package}-exec/bin` (project-bin). Package contents are already extracted by `catalog add`; install copies program assets from pkgDir. See `src/install/copy-assets.ts` (installBinDir), `src/install/install.ts`.

### atp agent project base discovery (Feature 3 acceptance criteria)

- **findProjectBase:** Added to `src/config/paths.ts`. Examines cwd and parents (radius 2) for `.git` or `.vscode` markers. **Not yet wired:** `src/commands/agent.ts` still uses `process.cwd()` directly; agent command does not yet use findProjectBase to resolve project base when run from a subdirectory.

---------------------------------------------------------------------------

## Updates (2026-03-17)

### Manifest implementation aligned with Feature 3

- **Item 2 (Manifest Schema):** Resolved. Implementation updated to match Feature 3 structure. Manifest now uses `Safehouse-Manifest` wrapper; each package entry has `name`, `version`, `source` (enum: station | local), and `binary_scope` (enum: user-bin | project-bin). See `src/config/types.ts`, `src/config/load.ts`, `src/init/safehouse-init.ts`. Backward compatibility: loader accepts both wrapped and legacy flat format.

### Review: Feature 3, configuration.md, implementation

- **Item 1 (atp agent vs workflow):** Resolved. Implementation (`src/commands/agent.ts`) explicitly requires an existing Safehouse and will fail with an error if one is not found. Feature 1 updated (lines 389–402, 432–437) to show `atp safehouse init` before `atp agent` in workflow examples.

- **Item 4 (Text patching placeholder syntax):** Resolved. Feature 3 (lines 243-249) defines `{bundle_name}` as the placeholder syntax. Implementation in `src/install/copy-assets.ts` replaces placeholders with bundle install path when copying skills/rules. Install flow builds `bundlePathMap` from manifest bundles and binary scope.

- **Item 5 (Safehouse registration):** Resolved. The Station's safehouse list lives in
  `${STATION_PATH}/safehouse_list.yaml`. Safehouse registration occurs during `atp safehouse init`:
  `src/init/safehouse-init.ts` calls `registerSafehouseInStation()` when the Station
  and list file exist.

- **Item 3 (UNIX conformant detection):** Resolved. Feature 3 (lines 336-396) explicitly defines "UNIX compliance bundle criteria" and "Usable Non-UNIX compliant bundle criteria".

### Review: Feature 1 (`1-package-definition-and-installation.md`)

- **Item 6 (Dependencies):** Resolved. Feature 1 documents `--dependencies` as
  pre-approval (lines 115–142, 293–294); without it, install fails. User remains in
  control. No interactive prompt flow.

---------------------------------------------------------------------------

## Current Status (as of 2026-03-17)

| Item | Status | Notes |
|------|--------|-------|
| 1. atp agent vs workflow | Resolved | Feature 1 updated with init-before-agent workflow. |
| 2. Manifest schema | Resolved | Implementation matches Feature 3: Safehouse-Manifest wrapper, name/version/source/binary_scope. |
| 3. UNIX conformant detection | Resolved | Feature 3 (lines 336–396) explicitly defines criteria. |
| 4. Text patching syntax | Resolved | Syntax `{bundle_name}` defined in Feature 3. Implemented in `copy-assets.ts`. |
| 5. Safehouse registration | Resolved | Implemented in safehouse-init. |
| 6. Dependencies | Resolved | Feature 1: `--dependencies` pre-approval, user in control |
| 7. Program asset installation | Resolved | Executables copied to user-bin or project-bin. |
| 8. atp agent project base discovery | Pending | findProjectBase in paths.ts; agent command not yet wired. |

---------------------------------------------------------------------------

## Overview

Following a review of `docs/features/3-package-install-process.md` and the current implementation, most gaps have been resolved. The manifest schema is aligned; text patching (`{bundle_name}`) and program asset copying are implemented. Unit and integration tests added for Feature 3. Remaining: wire `findProjectBase` into `atp agent` so it resolves project base when run from a subdirectory.

## Summary of Todos

- [x] Define the detection mechanism for "UNIX conformant" packages — Feature 3 (lines 336–396) documents criteria.
- [x] Specify the template/placeholder syntax for text material patching in rules/skills — Defined as `{bundle_name}` in Feature 3.
- [x] Clarify the relationship and required order between `atp safehouse init` and `atp agent` — Implementation enforces `atp safehouse init` first.
- [x] Formalize the `Safehouse-Manifest` YAML schema — Implementation matches Feature 3 (wrapper, name/version/source/binary_scope).
- [x] Verify the "Safehouse registration" process with the Station — Implemented in `safehouse-init.ts`.
- [x] Dependency pre-approval vs auto-install — Resolved in Feature 1.
- [x] Update `docs/features/1-package-definition-and-installation.md` to remove the claim that `atp agent` creates the safehouse.
- [x] Manifest schema: implementation updated to match Feature 3 (Safehouse-Manifest wrapper, package fields).
- [x] Implement text material patching in `src/install/copy-assets.ts`.
- [x] Implement program asset copying (executables to user-bin or project-bin).
- [ ] Wire `findProjectBase` into `atp agent` command for project base discovery from subdirectories.
