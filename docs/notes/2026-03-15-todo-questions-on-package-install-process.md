# Todo: Questions and gaps in Package Install Process

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created 2026-03-15.
Updated 2026-03-16.

---------------------------------------------------------------------------

## Updates (2026-03-17)

### Review: Feature 3, configuration.md, implementation

- **Item 1 (atp agent vs workflow):** Resolved. Implementation (`src/commands/agent.ts`) explicitly requires an existing Safehouse and will fail with an error if one is not found. Feature 3 workflow is correct; Feature 1 (line 393) needs update to reflect that `atp safehouse init` is the prerequisite.

- **Item 2 (Manifest Schema):** Resolved. Implementation (`src/config/types.ts`) uses a standard array of objects for `packages`. Feature 3 (lines 91-125) example YAML should be updated to match this cleaner structure.

- **Item 4 (Text patching placeholder syntax):** Syntax Defined. Feature 3 (lines 243-249) defines `{bundle_name}` as the placeholder syntax. Implementation in `src/install/copy-assets.ts` is still PENDING.

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
| 1. atp agent vs workflow | Resolved | Implementation requires safehouse first. Feature 1 needs doc update. |
| 2. Manifest schema | Resolved | Implementation uses standard object array. Feature 3 needs doc update. |
| 3. UNIX conformant detection | Resolved | Feature 3 (lines 336–396) explicitly defines criteria. |
| 4. Text patching syntax | Resolved | Syntax `{bundle_name}` defined in Feature 3. Implementation pending. |
| 5. Safehouse registration | Resolved | Implemented in safehouse-init. |
| 6. Dependencies | Resolved | Feature 1: `--dependencies` pre-approval, user in control |

---------------------------------------------------------------------------

## Overview

Following a review of `docs/features/3-package-install-process.md` and the current implementation, most gaps have been resolved or clarified. The primary focus now shifts to completing the implementation of text patching and tarball extraction.

## Summary of Todos

- [x] Define the detection mechanism for "UNIX conformant" packages — Feature 3 (lines 336–396) documents criteria.
- [x] Specify the template/placeholder syntax for text material patching in rules/skills — Defined as `{bundle_name}` in Feature 3.
- [x] Clarify the relationship and required order between `atp safehouse init` and `atp agent` — Implementation enforces `atp safehouse init` first.
- [x] Formalize the `Safehouse-Manifest` YAML schema to resolve list-vs-object ambiguity — Implementation uses standard object array.
- [x] Verify the "Safehouse registration" process with the Station — Implemented in `safehouse-init.ts`.
- [x] Dependency pre-approval vs auto-install — Resolved in Feature 1.
- [ ] Update `docs/features/1-package-definition-and-installation.md` to remove the claim that `atp agent` creates the safehouse.
- [ ] Update `docs/features/3-package-install-process.md` example manifest to match implementation.
- [ ] Implement text material patching in `src/install/copy-assets.ts`.
- [ ] Implement `tar.gz` extraction in `src/install/copy-assets.ts`.
