# ATP CLI behaviour for multi-type package layout (plan)

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

Kind: plan · date: 2026-03-25

This note extrapolates how **existing and new** `atp` commands should behave when [configuration.md](../configuration.md) **Extended atp-package.yaml layout (version 0.2.3+)** is authoritative: root **Type = `Multi`** with **parts**, versus legacy single-type manifests. It builds on the current CLI surface (`atp create package skeleton`, `atp package …`, `atp validate package`, `atp catalog add package`, `atp install`, `atp remove …`, `atp station …`, `atp safehouse …`, `atp agent …`) and on configuration rules for validation severity.

Today the implementation is largely **single-type**; this plan is the target behaviour for multi-type workflows.

# Conventions (all commands)

| Code | Meaning (proposed) |
|------|---------------------|
| 0    | Success; optional warnings on stderr only if policy says warnings do not fail the command. |
| 1    | User error: bad arguments, wrong cwd, invalid combination of flags, recoverable validation failure for the invoked command. |
| 2    | Fatal validation or environment failure: missing required files, unparseable manifest, invariant violated that must block publish/install. |

Align with existing [validate package](../../src/package/validate.ts) usage of **0 / 1 / 2**; extend definitions so **warnings** (e.g. duplicate `Part.type`) print to stderr and **do not** change exit code unless a `--strict` flag is added later.

# Part identity (cross-cutting)

Parts are ordered in YAML. For CLI targeting, use:

| Mechanism | Use |
|-----------|-----|
| **Index** | `0`-based or `1`-based index into `parts[]` (pick one globally; **1-based** matches human “first part”). |
| **Optional label** | Optional `id` or `label` field on each part (future schema); if present, commands accept `--part <id>` as an alternative to `--part-index <n>`. |

This plan assumes `--part <n>` refers to a **1-based** index into `parts[]` unless/until stable IDs exist.

# `atp create package` (new or evolved from `skeleton`)

**Goal:** Creating a package defaults to a **Multi** manifest suitable for adding **parts** of different types.

| Aspect | Proposal |
|--------|----------|
| Command shape | Prefer **`atp create package`** as the primary name; keep **`atp create package skeleton`** as an alias for compatibility, or deprecate with a one-line stderr notice. |
| Default manifest | `type: multi` (canonical casing TBD with parser), `name` / `version` empty or placeholders, **`parts: []`** or **`parts:`** with one empty stub part (see below). |
| Stub part | Either **no parts** (valid only after user runs `part add`) or **one** part `type: Skill`, `usage: []` to satisfy “at least one part” if validation requires it immediately. **Recommendation:** start with **`parts: []`** and let **`atp validate package`** remain red until `part add`—or document that **create** adds one minimal Skill part so `validate` can go green faster. |
| Legacy | **`atp create package --legacy`** or **`--single-type`** creates the pre–0.2.2 shape (root type + root usage/components/bundles only). |

### Acceptance criteria (`atp create package`)

| # | Criterion | Error | Exit |
|---|-----------|-------|------|
| 1 | Writes `atp-package.yaml` in cwd; optional reset of `stage.tar` policy matches current skeleton behaviour. | Cannot write file | 2 |
| 2 | Default file parses as Multi-capable manifest. | — | 0 |
| 3 | Unknown flags rejected with usage. | stderr message | 1 |

# `atp package type`

| Root type set | Behaviour |
|---------------|-----------|
| `multi` | Set root `type` to Multi; **do not** strip `parts` (warn if transitioning from legacy—see below). |
| `rule` / `skill` / … | Set root `type` to that Feature 2 type; **legacy rules** apply: require root `usage`, `components` or `bundles`; **clear or reject** `parts` if present (policy: **reject with exit 1** if `parts` non-empty to avoid silent data loss). |

### Acceptance criteria

| # | Criterion | Error | Exit |
|---|-----------|-------|------|
| 1 | `atp package type multi` sets Multi. | No manifest | 2 |
| 2 | `atp package type skill` on a Multi manifest with `parts` nonempty | Clear error: cannot switch to single-type without removing parts (or use `--force` if ever added). | 1 |
| 3 | Legacy type set on empty manifest | Fails validation until usage/components/bundles satisfied. | — (validate catches) |

# Adding and removing parts

Proposed subcommands:

| Command | Purpose |
|---------|---------|
| `atp package part add <typename>` | Append a part with `type` mapped from Feature 2 names (`rule` → `Rule`, etc.). Initial `usage` empty or interactive prompt later. |
| `atp package part remove --part <n>` | Remove part `n`; renumber or leave gap (prefer **remove by index**, no gaps, stable order). |
| `atp package part list` | Print index, type, usage line count, component/bundle counts. |
| `atp package part usage <n> <text...>` | Set **mandatory** usage for part `n`. |
| `atp package part add usage <n> <text...>` | Append a usage line (if multi-line usage supported per part). |

Alternative: **`atp package part add`** opens an editor—out of scope for minimal CLI; prefer explicit args first.

### Acceptance criteria (parts)

| # | Criterion | Error | Exit |
|---|-----------|-------|------|
| 1 | `part add` on **non-Multi** root type | Operation invalid unless manifest is Multi. | 1 |
| 2 | `part add` with unknown type | Unknown typename. | 1 |
| 3 | `part remove` invalid index | Index out of range. | 1 |
| 4 | After removal, `stage.tar` references | Removing a part should **remove or flag** staged assets tied to that part (implementation detail: optional `partIndex` in staging metadata or path prefix per part). | 1 or 2 if inconsistent |

# `atp package component add` / `bundle add` / `remove`

Today these apply to the **root** manifest. For Multi:

| Proposal | Behaviour |
|----------|-----------|
| **Scoped adds** | `atp package component add --part <n> <paths...>` required when `type` is Multi. |
| **Default** | If only one part exists, **optional** omit `--part` and default to part `1` (document clearly). |
| **Legacy** | If root type is not Multi, current behaviour: root `components` / `bundles`. |

| Command | Multi behaviour |
|---------|-----------------|
| `component add` | Requires `--part` if `parts.length !== 1`. |
| `component remove` | `component remove --part <n> <path>` or path unique in archive (harder); prefer **scoped remove**. |
| `bundle add` / `remove` | Same `--part` rule. |

### Acceptance criteria

| # | Criterion | Error | Exit |
|---|-----------|-------|------|
| 1 | Multi + multiple parts + missing `--part` | Error: specify `--part`. | 1 |
| 2 | Part index invalid | Out of range. | 1 |
| 3 | File missing on disk | Same as today. | 1 |
| 4 | Staged paths | Staging records which part owns which paths for validate and catalog pack. | 2 on corruption |

# `atp package name`, `version`, `usage`, `developer`, `copyright`, `license`, `summary`, `add`

| Field | Multi proposal |
|-------|----------------|
| `name`, `version`, `developer`, `copyright`, `license` | **Root only** (package identity). |
| `atp package usage` | **Ambiguous** today. Split: **`atp package usage`** sets **root** usage (optional for Multi); **`atp package part usage <n>`** sets part usage. For Multi, deprecate bare `usage` at root or print warning if `parts` nonempty. |
| `atp package add usage` | Root vs **`atp package part add usage <n>`** parallel. |
| `summary` | Lists root fields + **per-part** one-line summary (type, usage lines, component count, bundle count). |

### Acceptance criteria

| # | Criterion | Error | Exit |
|---|-----------|-------|------|
| 1 | `usage` without `--part` on Multi with multiple parts | Warn or require part (policy: **warn** to stderr, exit 0 if only warning). | 0 or 1 per policy |
| 2 | `summary` | Readable for both layouts. | 0 |

# `atp validate package`

Must implement [configuration.md](../configuration.md) rules:

| Rule | Result |
|------|--------|
| Type = Multi, `parts` missing or empty | **Fatal** (exit **2**), message per spec. |
| Type != Multi, incomplete legacy fields | **Fatal** (exit **2**). |
| Duplicate part types | **Warning** stderr, exit **0** unless `--strict` (future). |
| Multi + root `components`/`bundles`/`usage` present | Plan: **warning** or **error**—product choice; document in one sentence (see [todo note](./2026-03-25-todo-multi-type-docs-and-configuration-gaps.md)). |

| # | Criterion | Exit |
|---|-----------|------|
| 1 | Valid Multi with staged assets covering all referenced paths | 0 |
| 2 | Valid legacy single-type | 0 |
| 3 | Warnings only | 0, stderr |

# `atp catalog add package`

| Step | Behaviour |
|------|-----------|
| Pre-flight | Run same checks as **`atp validate package`**. |
| Failure | Same exit code as validate (**1** or **2**). |
| Success | Pack `stage.tar`, write station package dir, update catalog entry. Multi package: **one** catalog row per **package name** (not per part). |

### Acceptance criteria

| # | Criterion | Exit |
|---|-----------|------|
| 1 | Validate fails | Match validate |
| 2 | Validate passes, disk full | 2 |
| 3 | Success | 0 |

# `atp install`

| Aspect | Proposal |
|--------|----------|
| Unit of install | Still **one catalog package** (one manifest). |
| Expansion | For each **part**, install **that part’s** components/bundles into agent-relevant paths according to **part `type`** (Rule → rules dir, Skill → skills, Mcp → MCP config, etc.). |
| Ordering | Deterministic order: **as in `parts[]`**. |
| Dependencies | Unchanged: if package lists dependencies, resolve before or with `--dependencies`. |

### Acceptance criteria

| # | Criterion | Exit |
|---|-----------|------|
| 1 | One part fails (missing binary) | 1 or 2 per current install policy |
| 2 | Whole package removed on partial failure | Define: **best-effort** rollback or **leave** partial; document. |

# `atp remove safehouse <pkg>` / `atp remove station <pkg>`

| Aspect | Proposal |
|--------|----------|
| Scope | Remove **all** artefacts installed from that manifest (all parts). |
| Manifest tracking | Safehouse manifest records enough to uninstall by package name (today’s model), extended if per-part install paths need teardown. |

### Acceptance criteria

| # | Criterion | Exit |
|---|-----------|------|
| 1 | Package not installed | 1 |
| 2 | Success | 0 |

# `atp station list` / `atp safehouse list` / `atp catalog list`

| Command | Proposal |
|---------|----------|
| `catalog list` | Unchanged list of names/versions; optional **`--verbose`** later shows `type: multi` + part types. |
| `station list` / `safehouse list` | Optional summary: **`pkgname (multi: Skill, Mcp)`** when manifest is Multi. |

### Acceptance criteria

| # | Criterion | Exit |
|---|-----------|------|
| 1 | Empty list | 0 |
| 2 | Parse error in manifest | 2 |

# `atp agent`, `atp safehouse init`, `atp station init`

| Command | Multi impact |
|---------|--------------|
| `agent` / `handover` | **None** on manifest format; reinstall still reapplies all installed packages (each may be Multi internally). |
| `safehouse init` / `station init` | **None**. |

# Use cases (matrix)

| Use case | Flow | Exit 0 when |
|----------|------|-------------|
| New Multi package | `create package` → `part add` × N → `component`/`bundle add --part` → `validate` → `catalog add` | All steps succeed |
| Legacy maintenance | `create package --legacy` or single-type `type skill` + root fields | Validates under legacy rules |
| Add MCP to existing Skill package | `part add mcp` → `bundle add --part 2` | Second part staged and valid |
| Switch package to Multi | `package type multi` + add parts + migrate components (manual or `migrate` command future) | No orphan staging |
| CI | `atp validate package` in package repo | 0 with no stderr in strict mode (future) |

# Risks and dependencies

| Risk | Mitigation |
|------|------------|
| Staging `stage.tar` without per-part metadata | Redesign staging to record **part index** per file/bundle. |
| Manifest type in YAML (`multi` vs `Multi`) | Single canonical form in writer; parser accepts both during transition. |
| Command explosion | Prefer **`--part`** on existing verbs over dozens of new top-level commands where possible. |

# Suggested implementation order

1. Manifest model + loader + **validate** (Multi vs legacy).  
2. **`atp create package`** default Multi + **`part add` / `part list` / `part remove`**.  
3. **Scoped** `component` / `bundle` add/remove + staging metadata.  
4. **Install** expansion per part.  
5. **List/summary** enhancements.  
6. **Legacy** flags and migration helpers if needed.
