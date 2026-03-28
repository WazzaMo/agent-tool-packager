# 2026-03-28-todo-feature-4-gaps

(c) Copyright 2026 Warwick Molloy.
Created by Warwick Molloy Mar 2026.

## Review status (2026-03-28)

Cross-checked [Feature 4](../features/4-multi-type-packages.md), [configuration.md](../configuration.md) (Extended layout 0.2.3+), [Feature 3](../features/3-package-install-process.md), and [plan: ATP CLI multi-type layout](./2026-03-25-plan-atp-cli-multi-type-package-layout.md).

| # | Topic | Status | Notes |
|---|--------|--------|--------|
| 1 | Part re-indexing | **Partially closed** | Feature 4 documents behaviour after `atp package part <n> remove` (YAML + `stage.tar` path reflow, CLI dumps remaining parts). No explicit policy for **script stability** when indices change; **implementation** (safe extract/re-archive) still not specified in feature docs. |
| 2 | Per-part component/bundle remove | **Closed** | Feature 4 defines `atp package part <n> component remove <path>` and `atp package part <n> bundle remove <path>` with acceptance criteria and exit codes. |
| 3 | Variable substitution namespacing | **Closed (by design)** | Feature 4 requires **bundle directory names unique across all parts** (install collision + substitution). That avoids needing `{part1.patch_tool}`-style keys if authors follow the spec; Feature 3’s `{bundle}` convention stays valid per bundle name. |
| 4 | Installation granularity (`atp install`) | **Partially closed** | **Plan note** (2026-03-25): one catalog package; for Multi, install **each part** in `parts[]` order by part `type`—**no** selective “MCP-only” install described. **Feature 3** install steps still read single-type (“depending on the package type”); they are not yet rewritten to say “iterate `parts[]` for Multi.” |
| 5 | Legacy ↔ Multi `stage.tar` | **Partially closed** | Configuration + Feature 4: **reject** legacy + populated `parts`; Multi needs ≥1 part; empty `parts` on Multi fails validate. **Migration** remains manual (Feature 4 migration note); no documented automatic repack of legacy flat `stage.tar` into `part_{n}_{Type}/` prefixes. |
| 6 | Global bundle uniqueness | **Closed** | Feature 4 acceptance criteria: bundle paths unique **across the whole package** (not only within a part), matching the earlier recommendation. |

**Follow-ups (if any):** (a) Add a short subsection to Feature 3 install steps for Multi manifests (mirror plan note § `atp install`). (b) Optionally document script/index stability or “indices may change after part remove” for Gap 1. (c) Optional implementation note for tar rewrite on part remove.

---

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
