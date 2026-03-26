# Plan: creating packages when multiple type parts are possible

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Kind: plan · date: 2026-03-27

This note describes **target behaviour** for package authors who build **multi-type** manifests (`type: multi`, `parts[]`) as defined in [configuration.md](../configuration.md) (**Extended atp-package.yaml layout (version 0.2.3+)**) and [Feature 4 - Multi-type Packages](../features/4-multi-type-packages.md). It uses the same document patterns as [Feature 2 - Package Developer Support](../features/2-package-developer-support.md) (example workflows, commands, acceptance criteria, exit codes) and [Feature 3 - Package Install Process](../features/3-package-install-process.md) (explicit exit codes and error handling).

Lower-level CLI shapes and cross-command conventions are expanded in [2026-03-25-plan-atp-cli-multi-type-package-layout.md](./2026-03-25-plan-atp-cli-multi-type-package-layout.md). This note focuses on **authoring workflows** and **what “done” means** for validation and catalog steps.

# Assumptions

| Assumption              | Rationale                                      |
|-------------------------|------------------------------------------------|
| CWD is package root     | Feature 2 layout; manifest and stage here.     |
| Station initialised     | STATION_PATH may override for tests.           |
| Schema from config doc  | Multi needs parts; each part needs type, usage |

See [configuration.md](../configuration.md) for the Extended layout rules.

# Example workflow (multi-type package)

A developer wants a single distributable that combines a **Skill** (markdown) and an **Mcp** (bundle + optional markdown), without splitting into two catalog entries.

## Start from a skeleton

`atp create package skeleton`

(or the planned primary form `atp create package` when defaulting to Multi — see Feature 4 and the 2026-03-25 plan.)

Expected: `atp-package.yaml` is created with `type: multi` (or canonical casing agreed in implementation) and either an empty `parts: []` or a minimal stub part; `stage.tar` reset policy matches current skeleton behaviour (see Feature 2).

`atp package name vecfs-toolkit`

`atp package version 0.1.0`

`atp package developer "Example Dev"`

`atp package license "Apache License 2.0"`

`atp package copyright "Example Dev 2026"`

Root-level metadata commands behave like Feature 2: successful writes exit **0**.

## Add parts and part-scoped fields

Parts are the unit of type, usage, components, and bundles for Multi manifests.

| Step            | Proposed command                                |
|-----------------|-------------------------------------------------|
| Skill part      | `atp package newpart skill` (1) below           |
| Usage, part 1   | `atp package part 1 usage "<text>"` -> (2)      |
| Stage Skill     | `atp package part 1 component SKILL.md` -> (3)  |
| Mcp part        | `atp package newpart mcp`  -> (4)               |
| Usage, Mcp part | `atp package part 2 usage "<text>"`             |
| Bundle, part 2  | `atp package part 2 bundle add … ` (see (5))    |

Replace `<text>` with real usage strings (Feature 2 length limits apply).
`newpart` is distinct from `part` keeping the translation of the index after `part` simple.
The word `newpart` also flags to the user that a new part definition has begun so if this
is written into a shell script, that will be easy to read.

The `newpart` subcommand can trigger a validation process to check that previous parts are not
missing information before proceeding with a new part.

(1) CLI keywords map to Rule, Skill, Mcp, … per Feature 2. CLI prints part number "Part 1 added to package"

(2) Usage is mandatory on each part in the Part layout.

(3) Staging updates `stage.tar`; YAML lists components under that part and prints "Component SKILL.md added to part 1."

(4) Second part uses index 2 in examples and prints "Part 2 of Mcp type added to package."

(5) Append `--exec-filter mcp-exec/bin/*` when needed. Bundle rules match Feature 2; scope is the part, not the root.

If the part index is omitted when multiple parts exist, validation or the command should fail with a clear message (user error).


## Inspect and validate

`atp package summary`

Should list root metadata and **per-part** type, usage lines, component count, bundle count, and “missing” items using the same validate logic as `atp validate package`.

`atp validate package`

> Package appears complete. Mandatory minimal values are set for Multi layout.
> Each part has usage; staged content matches part components and bundles.

Exit code **0** when mandatory fields, **non-empty** `stage.tar`, and part constraints are satisfied.

## Publish to the user catalog

`atp catalog add package`

> Package vecfs-toolkit added to user package catalog.

Exit code **0** on success; gzip of `stage.tar` to `package.tar.gz` and copy under `user_packages/<name>/` per Feature 2.

# Example workflow (legacy single-type, for comparison)

Authors who need the pre–0.2.3 shape use a **legacy** or **single-type** create path (proposed: `atp create package skeleton --legacy` or `--single-type`).

`atp package type mcp`

Root `usage`, `components`, and optional `bundles` are **required** at the root; **`parts` must not** be populated. Validation errors and exit codes align with [configuration.md](../configuration.md): incomplete legacy layout → **non-zero** exit.

# Error scenarios (authoring)

| Situation                 | Behaviour (short)       | Exit    |
|---------------------------|-------------------------|---------|
| Multi, no parts           | Fatal: need ≥1 part     | 2       |
| Part missing usage        | List index and field    | 1–2 (1) |
| Legacy type + parts       | Reject mix              | 1       |
| Duplicate part types      | Warn stderr             | 0       |
| Ambiguous part target     | Error: index or `--part`| 1       |
| Invalid part index        | Part not found          | 1       |
| Bad or empty `stage.tar`  | Like Feature 2 validate | 1–2 (2) |

(1) Prefer exit 2 when mandatory fields are missing, aligned with `atp validate package`.

(2) Match Feature 2 validate tiers for staging versus mandatory fields.

Align global exit semantics with [2026-03-25-plan-atp-cli-multi-type-package-layout.md](./2026-03-25-plan-atp-cli-multi-type-package-layout.md): 0 success; 1 user or recoverable; 2 fatal validation or environment.

# ATP command specifics (multi-type authoring)

## `atp create package` / `atp create package skeleton`

### Acceptance criteria

1. Creates or overwrites `atp-package.yaml` in CWD; resets `stage.tar` per existing skeleton rules.
2. Default mode produces a **Multi-capable** manifest (`type: multi`, `parts` empty or documented stub).
3. Optional **legacy** flag produces single-type root fields only (no `parts`).
4. User-supplied strings are sanitised for YAML (Feature 2).

### Exit codes

| Code | Meaning                        |
|------|--------------------------------|
| 0    | Files written OK               |
| 1    | Bad args or unsafe proceed (1) |
| 2    | Cannot write files or dir      |

(1) Example: refuse overwrite without a confirm flag, if that policy exists.

## `atp package newpart <type-keyword>`

Adds a **Part** with `type` set from the keyword map (`rule` → `Rule`, etc., per Feature 2). Matches the workflow table above. An alias such as `atp package part add <type-keyword>` is optional if you want symmetry with `part remove`.

### Acceptance criteria

1. Appends to `parts[]` in order; revalidates indexes for subsequent commands.
2. Rejects unknown type keywords with a message listing valid keywords.
3. If the manifest is **not** Multi, fails unless migrating workflow is defined (e.g. `atp package type multi` first).

### Exit codes

| Code | Meaning                        |
|------|--------------------------------|
| 0    | Part added; YAML saved         |
| 1    | Layout, keyword, or write fail |
| 2    | Manifest missing or unparsable |

## `atp package part remove --part <n>`

Removes part `n` (1-based index per 2026-03-25 plan) and **removes** staged files that belong only to that part, or refuses with instructions if shared staging cannot be split (implementation detail: prefer **clear part-scoped paths** in `stage.tar`).

### Acceptance criteria

1. Part index in range; otherwise error.
2. `atp-package.yaml` and `stage.tar` stay consistent.

### Exit codes

| Code | Meaning                        |
|------|--------------------------------|
| 0    | Part removed; staging adjusted |
| 1    | Not found or unsafe removal    |

## `atp package part usage <n> …` / `atp package part add usage …`

Sets or appends **usage** lines for part `n` (mirror `atp package usage` / `add usage` at root in Feature 2).

### Acceptance criteria

1. **Usage** is mandatory for each part before validate passes.
2. Length limits match Feature 2 (80 chars per line where applicable).

### Exit codes

| Code | Meaning                        |
|------|--------------------------------|
| 0    | Updated                        |
| 1    | Invalid index or manifest error |

## `atp package part <n> component <path>` (and/or `component add --part <n>`)

Same rules as Feature 2 `atp package component add`, scoped to part `n` for Multi manifests. The workflow table uses **`part <n> component <path>`** so the part index stays explicit without a flag. A **`--part <n>`** form on the existing `component add` command is an alternative; pick one primary spelling in implementation to avoid two ways to do the same thing.

### Acceptance criteria

1. Paths under package root; file must exist; same error strings as Feature 2 for bad paths.
2. For Multi with multiple parts, the target part must be unambiguous; otherwise error.

### Exit codes

| Code | Meaning                          |
|------|----------------------------------|
| 0    | Staged on correct part           |
| 1    | Path, part target, or staging error |

## `atp package part <n> bundle add …` (and/or `bundle add --part <n>`)

Same as Feature 2 bundle add (UNIX `bin/` or `--exec-filter`), scoped to part `n`. Align with the same part-target pattern as component add.

### Acceptance criteria

1. Bundle uniqueness by name within the **part** (and globally if implementation requires unique bundle directory names in `stage.tar`).
2. Same stderr messages for non-UNIX bundles without filter as Feature 2.

### Exit codes

| Code | Meaning                        |
|------|--------------------------------|
| 0    | Success                        |
| 1    | Bundle, filter, or part scope  |

## `atp validate package`

### Acceptance criteria

1. **Multi:** at least one part; each part has **type**, **usage**, and required **components** / **bundles** per type expectations in Feature 2 (e.g. Skill expects markdown components; Mcp typically expects bundles).
2. **Legacy:** root-level mandatory fields and staging as in Feature 2.
3. Lists missing items by **part index** for Multi.
4. Emits **warnings** for duplicate part types; does not fail unless strict mode is specified later.

### Exit codes

| Code | Meaning                    |
|------|----------------------------|
| 0    | Valid; staging OK          |
| 1    | Staging or optional (1)    |
| 2    | Missing fields or bad file |

(1) Exact split follows implementation (Feature 2 baseline).

## `atp package summary`

### Acceptance criteria

1. Prints root fields and **per-part** summary.
2. Exit code **matches** `atp validate package` (Feature 2).

## `atp catalog add package`

### Acceptance criteria

1. Runs validation; refuses if validation would fail for Multi or legacy.
2. Same station layout as Feature 2 (`atp-package.yaml`, `package.tar.gz` under `user_packages/<name>/`).

### Exit codes

| Code | Meaning                    |
|------|----------------------------|
| 0    | Catalog and copy succeeded |
| 1    | Validate or publish failed |

# Migration note (author)

Moving from a **legacy** single-type file to **Multi** is a separate story: either a documented manual edit of `atp-package.yaml` or a future `atp package migrate` command. Until then, authors may create a new Multi skeleton and re-add components/bundles using the part-scoped CLI chosen for implementation (`part <n> …` and/or `--part <n>`).

# Test approach (high level)

1. **STATION_PATH** test station; `atp station init`.
2. Create Multi package with two parts (Skill + Mcp); stage files; `atp validate package` → **0**.
3. Duplicate part types → validate **0** with warning on stderr.
4. Empty `parts` with `type: multi` → validate **non-zero**.
5. Legacy manifest with `parts` present → command or validate **non-zero** per policy.
6. `atp catalog add package` → user catalog lists package; `package.tar.gz` present.

# References

| Doc             | Role                         |
|-----------------|------------------------------|
| configuration   | Multi layout (authoritative) |
| Feature 4       | Versions and motivation      |
| Feature 2       | Single-type CLI baseline     |
| 2026-03-25 plan | Commands and indexes         |

Links (paths under `docs/` unless noted):

- [configuration.md](../configuration.md)
- [Feature 4](../features/4-multi-type-packages.md)
- [Feature 2](../features/2-package-developer-support.md)
- [2026-03-25 CLI plan](./2026-03-25-plan-atp-cli-multi-type-package-layout.md)

Longer CLI detail is in the 2026-03-25 plan note. Tables in this file follow [doc-guide](../doc-guide.md): short rows, aligned bars, long paths moved below the table when needed.
