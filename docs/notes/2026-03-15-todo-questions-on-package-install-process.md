# Todo: Questions and gaps in Package Install Process

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created 2026-03-15.

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
- **Gap:** The document doesn't explicitly state *how* ATP detects if a `package.tar.gz` is UNIX conformant. Does it look for `bin/`, `share/`, `etc/` at the root of the archive, or is this a field in `atp-package.yaml`? Feature 1 mentions "UNIX conformant bundle dirs" but doesn't define the detection mechanism.

### 4. Text Material Patching Details

- **Observation:** Step 6 (lines 175-179) and "Text material patching" (lines 316-323) mention adjusting paths in markdown files (like `SKILL.md`).
- **Gap:** There is no specification for the *syntax* of these placeholders in the markdown templates. How does the installer identify which strings to "patch"? Is there a specific variable syntax (e.g., `{{BIN_PATH}}`)?

### 5. `atp remove` and `exfiltrate` Complexity

- **Observation:** The `exfiltrate` logic (lines 328-340 and 503-523) involves migrating binaries from Station to multiple Safehouses.
- **Question:** How does the Station "know" about all Safehouses? Lines 345-348 refer to a "safehouse list" in `atp-config.yaml`. Is there a registration step during `atp safehouse init` that updates the global Station config?

### 6. Dependency "Pre-approval" vs. Auto-install

- **Observation:** Feature 1 (line 142) says `--dependencies` acts as "pre-approval". Feature 3 (lines 294-300) asks "Whether atp install should auto-install...".
- **Gap:** The documents seem to lean towards "User in control" (manual flag) but also suggest "As a package manager, those dependencies should be satisfied". A clear decision on the default behavior and the interactive vs. non-interactive flow is missing.

## Summary of Todos

- [ ] Define the detection mechanism for "UNIX conformant" packages.
- [ ] Specify the template/placeholder syntax for text material patching in rules/skills.
- [ ] Clarify the relationship and required order between `atp safehouse init` and `atp agent`.
- [ ] Formalize the `Safehouse-Manifest` YAML schema to resolve list-vs-object ambiguity.
- [ ] Verify the "Safehouse registration" process with the Station to support `exfiltrate`.
