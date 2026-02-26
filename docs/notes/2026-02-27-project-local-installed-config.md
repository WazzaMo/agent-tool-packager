# Project-local installed config: .ahq and installed schema

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

# Goal

Store a local config under the working project directory at `{project-root}/.ahq`
that records what was installed in the project. This directory should be
git-ignored so each developer’s or CI’s install state is not committed.

# Location and gitignore

- **Path:** `./.ahq/` at the project root (same directory that may hold
  `catalog.yaml` for project-scoped catalog entries).
- **Git:** Add `.ahq/` to the project’s `.gitignore` so that the contents of
  `.ahq/` are not committed. The project catalog (`.ahq/catalog.yaml`) is
  optional and, if present, is typically committed so the team shares the same
  project-level package list; the **installed** record is local to the machine
  and should be ignored.

So we have two roles under `.ahq/`:

| File             | Purpose                    | Typically committed? |
|------------------|----------------------------|----------------------|
| catalog.yaml     | Project-level package list | Yes (team shared)    |
| installed.yaml   | Record of what was installed | No (git-ignored)   |

To keep “what was installed” strictly local, either ignore the whole `.ahq/`
directory or ignore only `.ahq/installed.yaml`. This note assumes ignoring
`.ahq/` as a simple default; projects that commit `catalog.yaml` can instead
ignore only `.ahq/installed.yaml`.

# What the installed config records

The installed config answers: “Which packages (and which versions) were
installed into this project, and optionally which files were written?”

That supports:

- Showing what’s installed without re-scanning the filesystem.
- Deciding what to overwrite or skip on a later `ahq install`.
- Future uninstall or upgrade by name.
- Auditing or tooling that needs a machine-readable install record.

# Schema for installed config

The catalog schema uses a list of package entries with `name`, `version`,
`description`, and `location`. For the **installed** record we do not need
`location` (assets are already copied). We do want identity and traceability.

## Nominated schema: installed.yaml

**File:** `./.ahq/installed.yaml`

**Shape:** A single top-level key `packages` (or `installed`) listing one entry
per installed package. Each entry is a small record of what was installed.

| Field     | Purpose                                      |
|-----------|----------------------------------------------|
| name      | Package name (matches catalog)               |
| version   | Version that was installed                   |
| source    | Optional: global | local | project              |
| installed_at | Optional: ISO8601 timestamp when installed |
| files     | Optional: list of relative paths written     |

- **name** and **version** align with the catalog and with
  `PackageEntry`. Required.
- **source** records where the entry came from (global / user local /
  project catalog) for traceability. Optional.
- **installed_at** helps with “when was this installed?” and ordering.
  Optional.
- **files** lists paths relative to the project (e.g. under `prompts/`) so
  that uninstall or diff can know exactly what to remove or compare.
  Optional but useful for correctness.

Example:

```yaml
# .ahq/installed.yaml — list of packages installed in this project

packages:
  - name: doc-guide
    version: 1.0.0
    source: global
    installed_at: "2026-02-27T10:00:00Z"
    files:
      - prompts/doc-guide.md
      - prompts/formatting.md
  - name: my-prompts
    version: 0.1.0
    source: local
    files:
      - prompts/my-prompts.md
```

Alternative key name: `installed` instead of `packages` makes it explicit that
these are “installed” records, not a catalog. Either is fine; `packages` keeps
the structure similar to `catalog.yaml` (list of package-like entries).

# Relation to catalog and config

- **Catalog** (global, user, project): index of *available* packages (name,
  version, description, location). Defines what can be installed.
- **Config** (`config.yaml`): prompt_sources and project_prompts_dir for
  “install all from config.”
- **Installed** (`installed.yaml`): record of what was *actually* installed in
  this project (from catalog installs and, if we track it, from config
  installs).

Config-based install (copying from `prompt_sources`) might be recorded
separately or as a synthetic “config” entry; that can be a follow-on. The
nominated schema above focuses on catalog-based installs first.

# Summary

| Concept        | Location        | Purpose                         |
|----------------|-----------------|---------------------------------|
| Project catalog| ./.ahq/catalog.yaml | Project-level package list   |
| Installed list | ./.ahq/installed.yaml | What was installed here    |

Recommendation: git-ignore `.ahq/` (or at least `.ahq/installed.yaml`). Use
`installed.yaml` with a list of entries shaped like the catalog (name, version)
plus optional source, installed_at, and files. This gives a clear, machine-readable
record of what is installed in the project.
