# Plan: Feature 4 - Multi-type Packages

(c) Copyright 2026 Warwick Molloy.
Created Mar 29, 2026.

# Summary

This plan outlines the implementation of **Feature 4: Multi-type Packages**. This feature extends the Agent Tool Packager (ATP) to allow a single package to contain multiple types of assets (e.g., a Skill, an MCP, and a Rule) grouped into distinct "parts." This avoids the need for multiple dependent packages for a single logical toolset.

# Implementation Strategy

The implementation will support two modes of operation:
1.  **Multi-type (New Standard):** Uses the `parts` list in `atp-package.yaml` and a per-part directory structure in `stage.tar`.
2.  **Legacy (Single-type):** Retains the root-level `type`, `components`, and `bundles` for backwards compatibility.

## Data Model Changes

The `atp-package.yaml` will be updated to version 0.2.3+ schema:
- **Root Level:** `type` defaults to `multi`. `parts` is a mandatory list for multi-type packages.
- **Part Object:** Contains `type`, `usage`, `components` (optional), and `bundles` (optional).

## Staging Area (stage.tar)

To support potential name collisions and clear association, `stage.tar` for multi-type packages will use a directory-per-part convention:
- Path format: `part_{index}_{type}/` (e.g., `part_1_Skill/SKILL.md`).
- Legacy packages will continue to use the flat structure at the root of `stage.tar`.

# CLI Command Updates

New and updated commands will be implemented to support multi-part authoring:

## Authoring Commands

- `atp create package [skeleton] [--legacy]`: Defaults to multi-type.
- `atp package newpart <type>`: Adds a new part to the `parts` list.
- `atp package part <n> usage <text>`: Sets usage for a specific part.
- `atp package part <n> component <path>`: Stages a component for a specific part.
- `atp package part <n> bundle <path> [--exec-filter <glob>]`: Stages a bundle for a specific part.
- `atp package part <n> remove`: Removes a part and its associated staged files, triggering a re-index.

## Validation and Utility

- `atp validate package`: Updated with two algorithms (Multi vs. Legacy) based on the root `type`.
- `atp package summary`: Displays per-part breakdown and validation status.
- `atp catalog add package`: Validates, gzips `stage.tar` to `package.tar.gz`, and updates the catalog.

# Installation and Removal

- **Installation:** `atp install` will iterate through all parts of a multi-type package, installing each into its agent-relevant path (e.g., Rule -> `rules/`, Skill -> `skills/`).
- **Atomic Install:** Installation should ideally be atomic; if one part fails, the whole package should be rolled back or marked as partially failed with clear instructions.
- **Removal:** Both `safehouse` and `station` removal will uninstall all artifacts associated with all parts of the package.

# Risks and Concerns

| Risk                      | Mitigation                                |
|---------------------------|-------------------------------------------|
| Name Collisions           | Enforce uniqueness across all parts.      |
| Re-indexing               | Precise renaming in manifest and staging. |
| Migration Path            | No auto-migration; restart authoring.     |
| Partial Installs          | Atomic, all-or-nothing installation.      |

## Discussion of Risks

### Bundle Name Collisions

Enforce global uniqueness of bundle names across all parts in a package during validation.

### Complexity of Re-indexing

Removal of a part requires careful renaming of directories in `stage.tar` and updating `atp-package.yaml`. This will be handled carefully in the `remove` subcommand logic.

### Migration Path

No automated migration from single-to-multi is planned. Users are encouraged to restart the authoring process with a new skeleton if conversion is needed.

### Partial Installations

Multi-type packages are intended to work together. The CLI will not support partial installation of individual parts.

# Next Steps

1.  Implement the updated `Package` and `Part` models with validation logic.

2.  Update `StagingService` to handle the `part_{index}_{type}/` directory structure.

3.  Extend the CLI with the `part <n>` sub-commands.

4.  Update the `Installer` to handle multi-part expansion.
