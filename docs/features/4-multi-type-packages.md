# Feature 4 - Multi-type Packages

In Cursor, an MCP may work better with a Rule or a Skill to inform the agent how
to use and when the MCP, to get the best effect.

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

# Inspiration

VecFS which is an MCP, vector embedder and Skill combination requires multi-type
packaging. It probably isn't the only package. I considered using dependencies
and thus spread it across multiple packages, each of the needed type but this
is clumsy.

## Backwards compatibility, versions and migration

Version 0.2.2 has been published and we don't know if people are using it, so
we must assume they are, and that asks us to provide a migration step.

### Version 0.2.3

This is the version for the Feature 4 (this) specification.

Will be the end of the 0.2.x versions as the final revision and will provide
a migration path to version 0.3.0 which means this cannot be a breaking change.

Version 0.2.3 will introduce the new atp-package.yaml layout and move new packages
to multi-type support while also handling install and remove operations of the
original format. This uses the `Multi` default package type.

### Version 0.3.0

This will support any existing, single-type packages with installation and removal,
as should always be allowed, but will only support creating multi-type packages.
Version 0.3.0 is a future version.

# Extending atp-package.yaml ...

Some fields remain singular, because they describe the package, like the name,
version, developer, copyright and the things associated with the type, like
the components and bundles must be part of another object, within a list
of such objects.

## version at or before 0.2.2 atp-package.yaml layout

See [configuration.md](../configuration.md) section 
**Extended atp-package.yaml layout (version 0.2.3+)** for the new layout.

The old layout for 0.2.2 and before is now only found below.

The `atp-package.yaml` has mandatory and optional fields as below and this now
documents the old layout where a single type was accidentally enforced.

`Package` is the root structure.

| Field Name | Opt or Mand  | Type        | max len |
|------------|--------------|-------------|---------|
| Name       | mandatory    | string      |     80  |
| Type       | mandatory    | string      |     20  |
| Developer  | optional     | string      |     80  |
| License    | optional     | string      |     80  |
| Version    | mandatory    | string      |     80  |
| Copyright  | optional     | string list |     80  |
| Usage      | mandatory    | string list |     80  |
| components | mandatory    | string list |    256  |
| bundles    | optional     | bundle list |    256  |

A **bundle list** is a list of objects, where each object contains:
- `path`: The relative path to the bundle directory.
- `exec-filter`: A glob pattern (relative to the package root) identifying executable files.

An example:

```yaml
name: clean-docs-and-code
type: Mcp 
developer: Warwick Molloy
license: Apache License 2.0
version: 0.1.0
copyright:
    - Warwick Molloy 2026
    - All rights reserved.
usage:
    - Use this for cleaning docs.
components:
   - SKILL.md
bundles:
   - path: mcp-exec
     exec-filter: mcp-exec/bin/*
```

## version => 0.2.3 atp-package.yaml layout

For the new layout, refer to configuration.md. That is the authoritative
guide for modern package layout.

------------------------------------------------------------------

# Example workflow (multi-type package)

A developer wants a single distributable that combines a **Skill** (markdown) and an **Mcp** (bundle + optional markdown), without splitting into two catalog entries.

## Assumptions

| Assumption              | Rationale                                      |
|-------------------------|------------------------------------------------|
| CWD is package root     | Feature 2 layout; package and stage here.      |
| Station initialised     | STATION_PATH may override for tests.           |
| Schema from config doc  | Multi needs parts; each part needs type, usage |

See [configuration.md](../configuration.md) for the Extended layout rules.

## Start from a skeleton and describe package

Execute:

`atp create package skeleton`

or the planned primary form `atp create package`, both defaulting to Multi-type.

Expected Result

`atp-package.yaml` is created with `type: multi` (or canonical casing agreed in implementation) and either an empty `parts: []` or a minimal stub part; `stage.tar` reset policy matches current skeleton behaviour (see Feature 2).

Any previous versions of atp-package.yaml or stage.tar will be replaced, to ensure there is no lingering content from
a previous packaging work.

Exit code:
0 = New atp-package.yaml and stage.tar was created successfully.
1 = Failure to create new files and error messages that indicate to the user which file could not be created.
    It should attempt both regardless so that it can indicate if either or both cannot be created.

### Base package information

Root-level metadata commands behave like Feature 2: successful returns exit code 0.

`atp package name vecfs-toolkit`

`atp package version 0.1.0`

`atp package developer "Example Dev"`

`atp package license "Apache License 2.0"`
Ideally the license string would be one of these given by [OSI license list](https://opensource.org/licenses) in the SPDX-ID.

`atp package copyright "Example Dev 2026"`


Expected Results

All of these operations should update the appropriate field in `atp-package.yaml` as specified in previous feature specifications.

### Add parts and the fields per-part

Parts are the unit of type, usage, components, and bundles for Multi manifests.

In the table below, replace `<text>` with real usage strings (Feature 2 length limits apply).
`newpart` is distinct from `part` and helps make for simpler command parsing with a different sub-command
structure.

The word `newpart` also flags to the user that a new part definition has begun so if this
is written into a shell script, that will be easy to read.

The `newpart` subcommand can trigger a validation process to check that previous parts are not
missing information before proceeding with a new part.


| Step            | Proposed command                        | Point ID  |
|-----------------|-----------------------------------------|-----------|
| Skill part      | `atp package newpart skill`             | (1) below |
| Usage, part 1   | `atp package part 1 usage "<text>"`     | (2)       |
| Stage Skill     | `atp package part 1 component SKILL.md` | (3)       |
| Mcp part        | `atp package newpart mcp`               | (4)       |
| Usage, Mcp part | `atp package part 2 usage "<text>"`     |           |
| Bundle, part 2  | `atp package part 2 bundle add … `      | see (5)   |


(1) CLI keywords map to Rule, Skill, Mcp, … per Feature 2. CLI prints part number "Part 1 added to package"

(2) Usage is mandatory on each part in the Part layout.

(3) Staging updates `stage.tar`; YAML lists components under that part and prints "Component SKILL.md added to part 1."

(4) Second part uses index 2 in examples and prints "Part 2 of Mcp type added to package."

(5) Append `--exec-filter mcp-exec/bin/*` when needed. Bundle rules match Feature 2; scope is the part, not the root.

If the part index is omitted when multiple parts exist, validation or the command should fail with a clear message (user error).

### Stage.tar file format

The decision to be made here is whether to keep the existing format that should serve the majority of packages;
or to pack files into the `stage.tar` separately, on a per-part basis.

The per-part approach partitions the stage file by part index and makes it feasible to have name collisions in the parts.
For instance, if part 1 and part 2 both have a file called "standards.md" for some reason, that's possible when
we separate the parts but it creates conflict under the original format for `stage.tar`.

For flexibility and clarity, we will go with a new per-part layout for stage.tar when using multi-type packaging.

New multi-type `stage.tar` layout for two parts. Let's say the below commands were issued:

```bash
atp package newpart skill
atp package part 1 usage "Skill to enable Agent to use long-term memory."
atp package part 1 component SKILL.md
atp package newpart mcp 
atp package part 2 usage "MCP server that provides long-term memory."
atp package part 2 bundle add vecfs-ts --exec-filter "vecfs-ts/bin/*"
```

The stage.tar internal base path for each Part will be based on this formula: "part_{index}_{type}/"

As a new part is added with the `newpart` subcommand, the existing part's base path must match this directory
naming convention.

```text
stage.tar
    - part_1_Skill/SKILL.md
    - part_2_Mcp/vecfs-ts/bin/mcp.js
    - part_2_Mcp/vecfs-ts/etc/config.json
```

With package validation and the index & type base path convention, any tampering with the `stage.tar` should be
detected. It is not bullet-proof but it is generally sufficient.

### Inspect and validate

`atp package summary`

Should list root metadata and **per-part** type, usage lines, component count, bundle count, and “missing” items using the same validate logic as `atp validate package`.

The bundles and components identified in `atp-package.yaml` for each part should be indentified in the `stage.tar` file
and file if the entries do not reconcile with the files, noting that bundles do not list all files but there must be at least
one binary file matching the exec filter specification.

`atp validate package`

> Package appears complete. Mandatory minimal values are set for Multi layout.
> Each part has usage; staged content matches part components and bundles.

Exit code **0** when mandatory fields, **non-empty** `stage.tar`, and part constraints are satisfied.

### Publish to the user catalog

`atp catalog add package`

> Package vecfs-toolkit added to user package catalog.

Exit code **0** on success; gzip of `stage.tar` to `package.tar.gz` and copy under `user_packages/<name>/` per Feature 2.


-------------------------------------------------------------------------------

# Example workflow (legacy single-type, for comparison)

Authors who need the pre–0.2.3 shape use a **legacy** create option `atp create package skeleton --legacy` this will assume
the type to be blank (NULL) until the user issues a `atp package type {kind}` command.

The single type is confirmed also by performing a package type command.

`atp package type mcp`

Root `usage`, `components`, and optional `bundles` are **required** at the root; **`parts` must not** be populated. Validation errors and exit codes align with [configuration.md](../configuration.md): incomplete legacy layout → **non-zero** exit.

The stage.tar format will be as in versions 0.2.2 and prior, which is defined in 
[2-package-developer-support](./2-package-developer-support.md) at "Staging executables."

When the root Type field does not equal "Multi", then the `atp package newpart xxx` and `atp package part N xxx` commands should
fail with error messages, as unsupported when the top-level package type has a specific, singular type. They must return exit code 1.

--------------------------------------------------------------------------------

# Error scenarios (authoring)

| Situation                 | Behaviour (short)       | Exit    |
|---------------------------|-------------------------|---------|
| Multi, no parts           | Fatal: need ≥1 part     | 2       |
| Part missing usage        | List index and field    | 1–2 (1) |
| Legacy type + parts       | Reject mix              | 1       |
| Duplicate part types      | Warn stderr             | 0       |
| Ambiguous part target     | Error: index            | 1       |
| Invalid part index        | Part not found          | 1       |
| Bad or empty `stage.tar`  | Like Feature 2 validate | 1–2 (2) |

(1) Prefer exit 2 when mandatory fields are missing, aligned with `atp validate package`.

(2) Match Feature 2 validate tiers for staging versus mandatory fields.


----------------------------

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

## `atp package part <n> remove`

Removes part `n` (1-based index per 2026-03-25 plan) and **removes** staged files that belong only to that part, or refuses with instructions if shared staging cannot be split (implementation detail: prefer **clear part-scoped paths** in `stage.tar`).

### Acceptance criteria

1. Part index in range; otherwise error.
2. `atp-package.yaml` and `stage.tar` stay consistent.

### Exit codes

| Code | Meaning                        |
|------|--------------------------------|
| 0    | Part removed; staging adjusted |
| 1    | Not found or unsafe removal    |

## `atp package part <n> usage …` / `atp package part <n> add usage …`

Sets or appends **usage** lines for part `n` (mirror `atp package usage` / `add usage` at root in Feature 2).

### Acceptance criteria

1. **Usage** is mandatory for each part before validate passes.
2. Length limits match Feature 2 (80 chars per line where applicable).

### Exit codes

| Code | Meaning                        |
|------|--------------------------------|
| 0    | Updated                        |
| 1    | Invalid index or manifest error |

## `atp package part <n> component <path>`

Same rules as Feature 2 `atp package component add`, scoped to part `n` for Multi manifests. The workflow table uses **`part <n> component <path>`** so the part index stays explicit without a flag.

### Acceptance criteria

1. Paths under package root; file must exist; same error strings as Feature 2 for bad paths.
2. For Multi with multiple parts, the target part must be unambiguous; otherwise error.

### Exit codes

| Code | Meaning                          |
|------|----------------------------------|
| 0    | Staged on correct part           |
| 1    | Path, part target, or staging error |

## `atp package part <n> bundle add …`

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

Moving from a **legacy** single-type file to **Multi** is a separate story: either a documented manual edit of `atp-package.yaml` or a future `atp package migrate` command. Until then, authors may create a new Multi skeleton and re-add components/bundles using the part-scoped CLI chosen for implementation.

# Test approach (high level)

1. **STATION_PATH** test station; `atp station init`.
2. Create Multi package with two parts (Skill + Mcp); stage files; `atp validate package` → **0**.
3. Duplicate part types → validate **0** with warning on stderr.
4. Empty `parts` with `type: multi` → validate **non-zero**.
5. Legacy manifest with `parts` present → command or validate **non-zero** per policy.
6. `atp catalog add package` → user catalog lists package; `package.tar.gz` present.
