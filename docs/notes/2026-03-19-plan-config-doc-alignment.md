# Plan for Aligning Configuration Documentation and Implementation

(c) Copyright 2026 Warwick Molloy.
Created 2026-03-19.

# Overview

This plan outlines the steps required to resolve discrepancies between the project's documentation (`docs/configuration.md`) and its current TypeScript implementation. Ensuring alignment is critical for both user clarity and system reliability.

# Identified Gaps

# Station Configuration Inconsistencies

The `StationConfig` interface and `DEFAULT_STATION_CONFIG` in `src/config/station-config.ts` lack the `standard-catalog` field described in the documentation. Additionally, the `gemini` agent defaults in code are missing the `project_path`, `rule`, and `skills` directories defined in the docs.

# Catalog Schema Divergence

The documentation and implementation both require `packages.standard` and `packages.user` as arrays of objects (`name` required; optional `version`, `description`, `location`). Flat `packages:` lists and string-only entries are rejected (empty packages result).

# Naming Convention Violations

The file `safehouse_list.yaml` used in the codebase violates the naming convention established in `AGENTS.md` and `docs/configuration.md`, which requires dashes and the `atp-` prefix (e.g., `atp-safehouse-list.yaml`).

# Manifest Field Strictness

The `DevPackageManifest` interface in `src/package/types.ts` marks several fields as optional (e.g., `name`, `type`, `version`) that the documentation specifies as mandatory.

# Proposed Implementation Steps

# 1. Update Station Configuration

Modify `src/config/types.ts` and `src/config/station-config.ts` to include the `standard-catalog` field.
Update `DEFAULT_AGENT_PATHS` to include the missing Gemini agent paths.

# 2. Reconcile Catalog Structure

Done: `src/catalog/types.ts` and `src/catalog/load.ts` use nested `standard` / `user` object lists only; `parseCatalogPackagesField` rejects non-object `packages` or invalid list items. Only the Station catalog file is loaded (no global or project catalog merge).

# 3. Standardize File Naming

Update `STATION_CONFIG_FILE`, `SAFEHOUSE_CONFIG_FILE`, and specifically the safehouse list filename in `src/config/load.ts` and `src/init/station-init.ts`.
Change `safehouse_list.yaml` to `atp-safehouse-list.yaml`.

# 4. Enforce Mandatory Fields

Audit `src/package/types.ts` and update the `DevPackageManifest` interface to reflect mandatory fields. This may require updating various `atp create` commands and validation logic to ensure these fields are always present.

# Risks and Concerns

# Breaking Changes

Renaming `safehouse_list.yaml` will prevent existing ATP Stations from finding their registered safehouses unless a migration or backward-compatible lookup is implemented.

# Catalog Complexity

Moving from a flat list to a nested structure in the catalog requires careful updates to the `atp catalog list` and `atp install` logic to ensure packages are correctly resolved from the new categories.

# Acceptance Criteria

# Documentation Sync

`docs/configuration.md` matches the TypeScript interfaces in `src/config/types.ts` and `src/catalog/types.ts`.

# Init Validation

`atp station init` produces files that strictly follow the project's naming conventions (`atp-*.yaml`).

# Functional Tests

All integration tests for installation, catalog listing, and station initialization pass with the updated structures.
