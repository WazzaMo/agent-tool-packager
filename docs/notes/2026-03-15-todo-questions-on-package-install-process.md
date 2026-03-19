# Todo: Questions and gaps in Package Install Process

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created 2026-03-15.
Updated 2026-03-16, 2026-03-17, 2026-03-18.

---------------------------------------------------------------------------

## Updates (2026-03-18)

### Agent Name Validation (Feature 3)

- **Implemented.** Feature 3 (lines 332–334) requires that only agents with entries in `agent-paths` be accepted. Added `isAgentInStationConfig()` in `src/config/agent-path.ts` and validation in `src/commands/agent.ts` for both `atp agent <name>` and `atp agent handover to <name>`. Unknown agents now exit with code 1 and message: "Agent 'X' is not configured in the Station. Add it to agent-paths in atp-config.yaml." Integration tests added in `test/integration/init.test.ts`.

### Coding Standards Applied (docs/clean-code.md)

- **JSDoc:** Added `@param`, `@returns`, and descriptions to exported and key internal functions in Feature 3 sources: `install.ts`, `copy-assets.ts`, `agent.ts`, `paths.ts`, `load.ts`, `safehouse-init.ts`, `resolve.ts`, `reinstall.ts`.
- **Import formatting:** Added blank lines after multi-line imports (install.ts, reinstall.ts) per clean-code convention.
- **copy-assets.ts header:** Updated; removed outdated "TODO" for tar.gz extraction; clarified programs are copied to user-bin or project-bin.

### Project Base Discovery Wired

- **findProjectBase wired:** `findProjectBase` in `src/config/paths.ts` updated to respect `SAFEHOUSE_PROJECT_PATH`.
- **isHomeDirectory:** Added to `src/config/paths.ts` to detect home directory anti-pattern during `atp safehouse init`.
- **Command updates:** `atp agent`, `atp safehouse init`, `atp safehouse list`, `atp install`, and `atp remove safehouse` now use `findProjectBase` to resolve the project root. This allows running these commands from subdirectories and correctly identifies the Safehouse location.

---------------------------------------------------------------------------

## Updates (2026-03-17, continued)

### Program asset / bundle executable installation

- **Bundle executables:** Implemented. Program assets from package manifest are copied to the install bin directory: `~/.local/bin` (user-bin) or `.atp_safehouse/{package}-exec/bin` (project-bin). Package contents are already extracted by `catalog add`; install copies program assets from pkgDir. See `src/install/copy-assets.ts` (installBinDir), `src/install/install.ts`.

### atp agent project base discovery (Feature 3 acceptance criteria)

- **findProjectBase:** Added to `src/config/paths.ts`. Examines cwd and parents (radius 2) for `.git` or `.vscode` markers. Wired into agent command in 2026-03-18 updates.

---------------------------------------------------------------------------

## Updates (2026-03-17)

### Manifest implementation aligned with Feature 3

- **Item 2 (Manifest Schema):** Resolved. Implementation updated to match Feature 3 structure. Manifest now uses `Safehouse-Manifest` wrapper; each package entry has `name`, `version`, `source` (enum: station | local), and `binary_scope` (enum: user-bin | project-bin). See `src/config/types.ts`, `src/config/load.ts`, `src/init/safehouse-init.ts`. Backward compatibility: loader accepts both wrapped and legacy flat format.

### Review: Feature 3, configuration.md, implementation

- **Item 1 (atp agent vs workflow):** Resolved. Implementation (`src/commands/agent.ts`) explicitly requires an existing Safehouse and will fail with an error if one is not found. Feature 1 updated (lines 389–402, 432–437) to show `atp safehouse init` before `atp agent` in workflow examples.

- **Item 4 (Text patching placeholder syntax):** Resolved. Feature 3 (lines 243-249) defines `{bundle_name}` as the placeholder syntax. Implementation in `src/install/copy-assets.ts` replaces placeholders with bundle install path when copying skills/rules. Install flow builds `bundlePathMap` from manifest bundles and binary scope.

- **Item 5 (Safehouse registration):** Resolved. The Station's safehouse list lives in
  `${STATION_PATH}/atp-safehouse-list.yaml`. Safehouse registration occurs during `atp safehouse init`:
  `src/init/safehouse-init.ts` calls `registerSafehouseInStation()` when the Station
  and list file exist.

- **Item 3 (UNIX conformant detection):** Resolved. Feature 3 (lines 336-396) explicitly defines "UNIX compliance bundle criteria" and "Usable Non-UNIX compliant bundle criteria".

### Review: Feature 1 (`1-package-definition-and-installation.md`)

- **Item 6 (Dependencies):** Resolved. Feature 1 documents `--dependencies` as
  pre-approval (lines 115–142, 293–294); without it, install fails. User remains in
  control. No interactive prompt flow.

---------------------------------------------------------------------------

## Current Status (as of 2026-03-18)

| Item | Status | Notes |
|------|--------|-------|
| 1. atp agent vs workflow | Resolved | Feature 1 updated with init-before-agent workflow. |
| 2. Manifest schema | Resolved | Implementation matches Feature 3: Safehouse-Manifest wrapper, name/version/source/binary_scope. |
| 3. UNIX conformant detection | Resolved | Feature 3 (lines 336–396) explicitly defines criteria. |
| 4. Text patching syntax | Resolved | Syntax `{bundle_name}` defined in Feature 3. Implemented in `copy-assets.ts`. |
| 5. Safehouse registration | Resolved | Implemented in safehouse-init. |
| 6. Dependencies | Resolved | Feature 1: `--dependencies` pre-approval, user in control |
| 7. Program asset installation | Resolved | Executables copied to user-bin or project-bin. |
| 8. atp agent project base discovery | Resolved | findProjectBase in paths.ts; wired into agent, safehouse, install, remove commands. |
| 9. Agent name validation | Resolved | `isAgentInStationConfig`; `atp agent` and `atp agent handover` reject unknown agents. |

---------------------------------------------------------------------------

## Implementation Gaps (as of 2026-03-18)

Review of Feature 3 source (`src/install/*`, `src/commands/agent.ts`, `src/config/*`, `src/init/safehouse-init.ts`) against the spec and clean-code standards. The following gaps or clarifications remain:

| Gap | Severity | Description |
|-----|----------|-------------|
| Interactive confirmation for safehouse init | Low | Feature 3 (lines 279–283) suggests prompting the user to "explicitly confirm" when project base is uncertain. Current behaviour exits with an error and instructs the user to set `SAFEHOUSE_PROJECT_PATH`. No interactive stdin prompt. May be intentional (non-interactive CLI). |
| Param naming in load.ts | Low | Functions such as `loadSafehouseConfig(cwd)`, `addPackageToSafehouseManifest(..., cwd)` use `cwd` but expect the **project base** directory. Callers now pass `projectBase` from `findProjectBase`. Consider renaming to `projectBase` for API clarity. |
| Bundle vs package.tar.gz layout | Info | Feature 3 (step 4) describes unpacking bundle directories from `package.tar.gz` with UNIX conformant / exec-filter handling. The implementation copies from `manifest.assets` (program type) and uses `manifest.bundles` for `{bundle_name}` path mapping. Package layout is assumed correct from catalog add; UNIX conformant handling is in the packager (Feature 2). Install assumes catalog already produced the desired structure. |

---------------------------------------------------------------------------

## Overview

Following a review of `docs/features/3-package-install-process.md` and the current implementation, the major gaps from the original todo list have been resolved. The manifest schema is aligned; text patching (`{bundle_name}`) and program asset copying are implemented. Project base discovery (`findProjectBase`) is wired into all relevant commands, allowing them to work correctly from subdirectories and respect `SAFEHOUSE_PROJECT_PATH`.

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
- [x] Wire `findProjectBase` into `atp agent` command for project base discovery from subdirectories.
- [x] Agent name validation: reject unknown agents in `atp agent` and `atp agent handover` (Feature 3 lines 332–334).
