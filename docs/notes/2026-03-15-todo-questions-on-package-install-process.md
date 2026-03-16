# Todo: Questions and gaps in Package Install Process

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created 2026-03-15.
Updated 2026-03-16.

---------------------------------------------------------------------------

## Updates (2026-03-16)

### Review: Feature 3, configuration.md, implementation

- **Item 5 (Safehouse registration):** Resolved. The Station's safehouse list lives in
  `${STATION_PATH}/atp-safehouse-list.yaml` (per configuration.md; implementation uses
  `safehouse_list.yaml`). Safehouse registration occurs during `atp safehouse init`:
  `src/init/safehouse-init.ts` calls `registerSafehouseInStation()` when the Station
  and list file exist. Consider documenting this registration step in configuration.md.

- **Item 3 (UNIX conformant detection):** Superseded by bundle add section below.

### Review: Feature 3 (2026-03-16 — bundle add section)

- **Item 3 (UNIX conformant detection):** Addressed. Feature 3 (lines 236–269) now
  explicitly defines "UNIX compliance bundle criteria" (bin/ with executables; etc/, share/
  optional; minimal = bin/ with executable files) and "Usable Non-UNIX compliant bundle
  criteria" (executables somewhere in structure + exec-filter glob). Detection mechanism
  is now documented.

### Review: Feature 1 (`1-package-definition-and-installation.md`)

- **Item 6 (Dependencies):** Resolved. Feature 1 documents `--dependencies` as
  pre-approval (lines 115–142, 293–294); without it, install fails. User remains in
  control. No interactive prompt flow.

- **Item 3 (UNIX conformant):** Feature 1 supplies the definition; detection = inspect
  bundle root for `bin/`, `share/`, `etc/`. Explicit “how to detect” could be stated.

- **Items 1, 2, 4:** Unchanged. Feature 1 "Agent nomination" (line 304) says "The `atp
  agent` command creates the safehouse path" — contradicts Feature 3 (atp agent must
  fail without safehouse). Manifest schema and text-patching placeholder syntax still
  unspecified.

---------------------------------------------------------------------------

## Current Status (as of 2026-03-16)

| Item | Status | Notes |
|------|--------|-------|
| 1. atp agent vs workflow | Open | Contradiction: Feature 1 ("atp agent creates safehouse path") vs Feature 3 (requires safehouse first) |
| 2. Manifest schema | Open | List-vs-object structure unspecified |
| 3. UNIX conformant detection | Resolved | Feature 3 (lines 236–269) explicitly defines UNIX/N non-UNIX criteria |
| 4. Text patching placeholder syntax | Open | No specification |
| 5. Safehouse registration | Resolved | Implemented in safehouse-init; consider documenting in configuration.md |
| 6. Dependencies | Resolved | Feature 1: `--dependencies` pre-approval, user in control |

---------------------------------------------------------------------------

## Overview

Following a review of `docs/features/3-package-install-process.md`, several questions and potential gaps have been identified regarding the technical implementation and consistency of the package installation process.

## Questions and Gaps

### 1. Discrepancy in `atp agent` command vs. workflow

- **In `3-package-install-process.md` (lines 55-57):** The workflow shows `atp agent cursor`.
- **In `AGENTS.md` (Key commands):** It lists `atp agent <name>` as "assign agent to project".
- **In `1-package-definition-and-installation.md` (Acceptance Criteria):** It mentions `atp agent cursor` informs ATP to use `.cursor`.
- **Gap:** The feature 3 document (and others) implies `atp agent` is used *after* `atp safehouse init`, but `AGENTS.md` implies it's a primary setup command. It's unclear if `atp agent` should automatically call `atp safehouse init` if it hasn't been run, or if it strictly requires an existing safehouse.

### 2. Manifest Schema Inconsistency

- **In `3-package-install-process.md` (lines 84-98 and 103-119):** The example YAML structure for `Safehouse-Manifest` shows lists of single-key objects (e.g., `- version: 0.1.0`) inside `packages-installed`. 
- **Comparison:** This is an unusual YAML pattern for a manifest. Typically, these would be fields of a single object (e.g., `version: 0.1.0` directly under the package name).
- **Question:** Is this specific list-of-objects structure intentional for extensibility, or should it be a standard object mapping?

### 3. "UNIX conformant" vs. "Non-UNIX" extraction logic

- **Observation:** Step 4 (lines 151-160) describes different unpacking behaviors based on "UNIX conformant" status.
- **Status:** Resolved. Feature 3 (lines 236–269) explicitly defines "UNIX compliance bundle criteria" (bin/ with executables; etc/, share/ optional) and "Usable Non-UNIX compliant bundle criteria" (exec-filter glob). Feature 1 (lines 188–201) also defines UNIX conformant dirs.

### 4. Text Material Patching Details

- **Observation:** Step 6 (lines 175-179) and "Text material patching" (lines 316-323) mention adjusting paths in markdown files (like `SKILL.md`).
- **Gap:** There is no specification for the *syntax* of these placeholders in the markdown templates. How does the installer identify which strings to "patch"? Is there a specific variable syntax (e.g., `{{BIN_PATH}}`)?

### 5. `atp remove` and `exfiltrate` Complexity

- **Observation:** The `exfiltrate` logic (lines 328-340 and 503-523) involves migrating binaries from Station to multiple Safehouses.
- **Question:** How does the Station "know" about all Safehouses? The safehouse list lives in a separate file (`atp-safehouse-list.yaml` per configuration.md). Is there a registration step during `atp safehouse init`? **Resolved:** Yes — `src/init/safehouse-init.ts` registers the safehouse when the Station and list file exist.

### 6. Dependency "Pre-approval" vs. Auto-install

- **Observation:** Feature 1 (line 142) says `--dependencies` acts as "pre-approval". Feature 1 "Questions about feature" (lines 240–246) asks whether atp install should auto-install dependencies.
- **Status:** Resolved. Feature 1 documents the decision: user in control via `--dependencies` flag; without it, install fails. "Dependency auto-install UX" (lines 293–294) confirms dependencies are assumed not needed unless pre-approved. No interactive prompt flow described.

## Summary of Todos

- [x] Define the detection mechanism for "UNIX conformant" packages — Feature 3 (lines 236–269) now documents UNIX/N non-UNIX criteria explicitly.
- [ ] Specify the template/placeholder syntax for text material patching in rules/skills.
- [ ] Clarify the relationship and required order between `atp safehouse init` and `atp agent` — resolve contradiction in Feature 1 ("atp agent creates safehouse path" vs Feature 3 requiring safehouse first).
- [ ] Formalize the `Safehouse-Manifest` YAML schema to resolve list-vs-object ambiguity.
- [x] Verify the "Safehouse registration" process with the Station to support `exfiltrate` — implemented in safehouse-init; consider documenting in configuration.md.
- [x] Dependency pre-approval vs auto-install — resolved; Feature 1 documents `--dependencies` as pre-approval, user in control.
