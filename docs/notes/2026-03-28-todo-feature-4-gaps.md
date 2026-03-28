# 2026-03-28-todo-feature-4-gaps

(c) Copyright 2026 Warwick Molloy.
Created by Warwick Molloy Mar 2026.

## Gaps and Questions for Feature 4 (Multi-type Packages)

Reviewing the documentation for Multi-type packages has revealed several areas requiring clarification or further planning before implementation.

### 1. Part Re-indexing Complexity
When a part is removed (`atp package part <n> remove`), the documentation states that parts are re-indexed and the `stage.tar` layout is updated.
- **Question:** How should the CLI handle the potential disruption to user scripts that rely on specific indices?
- **Gap:** The technical implementation for "re-indexing" `stage.tar` (extracting and re-archiving with new prefixes) needs to be performant and safe against data loss.

### 2. Component/Bundle Removal within Parts
Feature 4 describes adding components and bundles to specific parts (e.g., `atp package part <n> component <path>`).
- **Gap:** There is no explicit command defined for removing a *single* component or bundle from a specific part without removing the entire part. Should it be `atp package part <n> component remove <path>`?

### 3. Variable Substitution Namespacing
Feature 3 introduces variable substitution (e.g., `{patch_tool}`).
- **Question:** In a multi-type package, are bundle names required to be globally unique across all parts to avoid substitution collisions? 
- **Gap:** If bundle names are not unique, we need a namespacing convention for substitutions (e.g., `{part1.patch_tool}`).

### 4. Installation Granularity
Feature 1 suggests packages are installed as a unit, but multi-type packages combine different product types.
- **Question:** Does `atp install` always install ALL parts of a multi-type package, or can a user select specific types (e.g., "just the MCP part")? 
- **Gap:** The installation logic in Feature 3 needs to be explicitly updated for the `parts` list structure, defining how each part's `type` determines its destination path.

### 5. Multi-type `stage.tar` Migration
Feature 4 introduces a new `part_{index}_{type}/` prefix in `stage.tar`.
- **Gap:** We need a clear plan for how `atp validate package` and `atp catalog add` handle a package that was started in "legacy" mode but then switched to "multi" mode (or vice versa), especially regarding the `stage.tar` content.

### 6. Unique Bundle Names in Staging
Feature 4 mentions "Bundle uniqueness by name within the part (and globally if implementation requires...)".
- **Question:** If the staging area uses `part_{index}_{type}/` as a prefix, do we still need global uniqueness for bundle directory names? 
- **Recommendation:** Enforce global bundle name uniqueness within a package to simplify variable substitution and installation.
