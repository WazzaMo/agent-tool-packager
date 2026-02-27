# Catalog action plan: global vs local packages and lifecycle

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

## Goal

Define an action plan for implementing a catalog that supports both packages
shipped or known by the ahq project (global) and packages added by the user
for testing or local preferences (local). Focus on lifecycle operations and
clear separation between the two sources, with test ideas to validate behaviour.

This builds on the package and catalog concepts in
`2026-02-25-package-metadata-and-catalog.md`.

## Global vs local package sources

### Global (ahq-defined) packages

Packages that the ahq project knows about. They are part of the product.

| Aspect        | Description                                          |
|---------------|------------------------------------------------------|
| Definition    | Catalog data bundled with ahq or from ahq’s registry |
| Location      | Shipped in binary or fetched from ahq’s default URL  |
| Mutability    | Read-only for the user; updated with ahq releases    |
| Purpose       | Official prompts, guides, and curated assets         |

Users can list and install these packages but cannot add, edit, or remove
entries in the global catalog from the CLI.

### Local (user-defined) packages

Packages the user has added for their own use.

| Aspect        | Description                                          |
|---------------|------------------------------------------------------|
| Definition    | Catalog entries and assets under the user’s control   |
| Location      | User config/catalog, e.g. `~/.ahq/catalog.yaml`      |
| Mutability    | User can add, remove, and update entries              |
| Purpose       | Testing, private prompts, team-local or custom assets|

Local packages are the only ones the user can create, update, or delete via
lifecycle operations.

### Merged view

At runtime the CLI presents a single logical catalog: global + local. When
both define a package with the same name, local wins (user override). Resolution
order: load global catalog, then local; for duplicate names, local entry
replaces or shadows the global one.

## Lifecycle operations

Operations that the CLI must support, and who can do what.

### List packages

- **Behaviour:** Show packages available to install (merged view).
- **Source:** Global + local; display origin (e.g. “global” vs “local”) so the
  user can see which are ahq-defined and which are their own.
- **CLI idea:** `ahq list` or `ahq catalog list`; optional flag to filter by
  source (e.g. `--local-only`, `--global-only`).

### Install a package

- **Behaviour:** Resolve package by name from merged catalog, then copy assets
  into the project (per existing install behaviour).
- **Source:** Look up name in merged catalog (local wins on name clash).
- **CLI idea:** `ahq install <name>` or `ahq install --package <name>`.

### Add a local package

- **Behaviour:** Register a new package in the user’s local catalog (path or
  URL + optional name/version). Creates or updates `~/.ahq/catalog.yaml` (or
  project catalog if we support it).
- **Source:** Local only. Global catalog is never modified.
- **CLI idea:** `ahq catalog add <name> <path|url>` with optional `--version`.

### Remove a local package

- **Behaviour:** Remove an entry from the user’s local catalog by name. Only
  local entries can be removed; attempting to “remove” a global-only package
  should report that it is not a local package (or suggest hiding/overriding
  with a local stub if we support that later).
- **Source:** Local only.
- **CLI idea:** `ahq catalog remove <name>`.

### Update local catalog from source

- **Behaviour:** For local packages that point at a path or URL, re-read
  manifest (and optionally assets) to refresh version or asset list. Does not
  change global catalog.
- **Source:** Local only.
- **CLI idea:** `ahq catalog refresh` or `ahq catalog update [name]`.

### Show package details

- **Behaviour:** Show manifest and origin (global vs local) for a given name.
- **CLI idea:** `ahq catalog show <name>`.

## Implementation order (suggested)

1. Define in-memory structures for global catalog and local catalog, plus a
   merged view (slice or map with source tag).
2. Load global catalog from bundled file or built-in default; load local
   catalog from `~/.ahq/catalog.yaml` if present.
3. Implement merge logic (local overrides global on name clash).
4. Implement list (merged view with source labels).
5. Wire install to resolve by name from merged catalog.
6. Implement add/remove/refresh for local catalog and persist to
   `~/.ahq/catalog.yaml`.

## Unit test ideas

| Area              | What to test                                              |
|-------------------|-----------------------------------------------------------|
| Catalog parsing   | Valid YAML for global and local; invalid YAML fails clean |
| Merge logic       | Local entry overrides global for same name                |
| Merge logic       | No local: merged catalog equals global                    |
| Merge logic       | Empty global: merged catalog equals local                 |
| Source tagging    | Merged view marks each entry as global or local           |
| Add local         | Adding a name persists and appears in merged list         |
| Remove local      | Removing a name drops only local entry; global unchanged   |
| Remove local      | Remove non-existent or global-only name gives clear error  |
| List filtering    | Filter by global-only or local-only matches expected set  |

## Integration test ideas

| Scenario | Steps | Expected outcome |
|----------|--------|------------------|
| Install from global | No local catalog; `ahq install <global-pkg>` | Assets from bundled/default catalog appear in project |
| Install from local | Local catalog has package A; `ahq install A` | Assets from user’s path/URL appear in project |
| Local overrides global | Global and local both define `doc-guide`; `ahq install doc-guide` | Assets come from local source |
| List shows origin | Global and local packages exist; `ahq list` | Output shows which packages are global vs local |
| Add then install | `ahq catalog add my-prompt ./my-prompt` then `ahq install my-prompt` | Package appears in list and install copies files |
| Remove then list | Add local package, remove it, list | Package no longer in list; install fails with clear message |
| Missing config | No `~/.ahq` or catalog file; list/install | Clear error or empty list, no crash |
| Catalog refresh | Local package at path; change manifest; refresh | List/show reflects new version or assets |

## Open questions (resolved)

- **Project-local catalog:** Implemented in first cut. Precedence: project over
  user over global. File: `./.ahq-local/catalog.yaml`.
- **Remove of a global name:** Not implemented as "hide via local stub". Only
  entries in the user's local catalog can be removed; removing a global-only
  package reports a clear error. Hiding is achieved by adding a local package
  with the same name (local overrides global).


## For open questions (decisions)

What is made available via ahq is whatever is in the catalog: either from the
global (ahq) catalog or from a local, custom package.

- **Precedence:** Local catalog items take precedence over global packages.
  When the same name exists in both, the local entry is used (local "hides"
  global in the merged view).

- **Where packages live:** Catalog entries (global or local) point at
  locations elsewhere (paths or URLs). They are not stored inside the project
  where they are used. Installing is a deliberate step: `ahq install <name>`
  copies assets from the chosen catalog source into the project. A manual copy
  into the project bypasses ahq and is not reflected in the catalog.

- **Local packages:** A user may have their own directory elsewhere (e.g.
  `~/my-prompts`) and add it as a local package. That path is listed in
  `~/.ahq/catalog.yaml`. Due to precedence, that local package will hide any
  global package with the same name when listing or installing.
