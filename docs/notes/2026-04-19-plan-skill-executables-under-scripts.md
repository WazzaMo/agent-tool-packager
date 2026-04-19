# Plan: install skill bundle executables under `scripts/` (Agent Skills spec)

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Purpose

This is a `plan` note (see [Doc guide](../doc-guide.md) — Notes). It records ideas, risks, and a
sequenced approach to change install behaviour so skill-related executables match the
[Agent Skills specification](https://agentskills.io/specification) layout (`scripts/` next to
`SKILL.md`).

We should be guided by the specification telling us where binary or executable code
should be located because this is where agents will expect it. Where skills are concerned
the path that matters is where the agent expects to find the script and code to run
as instructed by the skill.

When authoring or installations must fail to protect integrity, do so by:

1. giving a useful error message with enough context that the user understands cause and
   what can be done to correct it.

2. Use program exits with Exit code 2 to signal abnormal termination.

# Context

The specification places optional executable code under `scripts/` beside `SKILL.md`, with
in-body references such as `scripts/extract.py`.

ATP currently marks bundle executables (paths matched by `bin/*` or `exec-filter`) as
`type: program` in the catalog manifest. `copyProgramAssetsOnly` copies those files to
`~/.local/bin` or `.atp_safehouse/<package>-exec/bin`, using only the basename of each file.
They are excluded from the skill `raw_file_copy` tree, so they never appear under
`{agent}/skills/<name>/scripts/`.

That matches a UNIX-style bundle with `bin/` but diverges from the public Agent Skills
on-disk layout. Providers that share `buildSkillInstallProviderActions` should gain one
consistent behaviour.

Related notes:

- [2026-04-07-note-standardised-skill-provider.md](./2026-04-07-note-standardised-skill-provider.md)
- [2026-04-12-plan-catalog-skill-bundle-asset-enrichment.md](./2026-04-12-plan-catalog-skill-bundle-asset-enrichment.md)

# Goal

When a Skill part includes bundle programs (bundles without `skip-exec`), installed copies
that belong to that skill should appear as:

```text
<skills-parent>/<skill-name>/scripts/<executable-basename>
```

Behaviour should align with the spec `scripts/` directory and with `{skill_scripts}/`
expansion in `patchSkillScriptsPlaceholder` (already mapped to `scripts/`).

The exact mapping from staged paths to that filename is fixed in **Proposed direction** (install
path rule).

# Non-goals

Initial implementation should not:

- Change how non-skill packages or parts install `program` assets to `bin/` where that still
  applies.

- Require authors to hand-maintain a physical `scripts/` tree in the tarball when placement can
  be derived from `exec-filter` or `bin/*`.

- Give Codex or other agents a different relative layout; only the skills parent path differs,
  not the tree under each skill name.

# Current pipeline

| Stage              | Role                                       |
|--------------------|--------------------------------------------|
| Catalog enrichment | Split bundle files into program vs skill.  |
| Provider skill     | Copy skill assets; write `SKILL.md`.       |
| Post-provider      | Copy each program row to `installBinDir`.  |

Catalog enrichment uses `appendProgramAssetsForBundleRoot` and
`appendSkillFilesFromBundleTree`. The skill step is `buildSkillInstallProviderActions`. The
post step is `copyProgramAssetsOnly`.

# Proposed direction

### Classify skill-adjacent programs

Define skill-adjacent programs as manifest `assets[]` rows where:

- `type` is `program`, and

- the staged `path` lies under the same staged bundle tree as the `skill` assets for one
  catalog install part (same `part_N_Type/...` prefix and bundle directory as
  `resolveSkillBundleRoot` for that part).

For Multi packages, reuse prefix and bundle root rules from
`appendMultiTypeMarkdownAndBundleAssets`. For legacy single-type Skill packages, use the root
bundle convention in `enrichSingleTypePackageAssets`.

Programs that fail this predicate keep today’s `copyProgramAssetsOnly` behaviour.

### Install path rule for skill-adjacent programs

Install every skill-adjacent program at:

```text
<relativeSkillDir>/scripts/<basename(staged-path)>
```

where `<relativeSkillDir>` is the same directory segment the planner already uses for
`SKILL.md` (e.g. `skills/<skill-name>` with optional parent prefix from `SkillInstallPathOptions`).

Rationale: the Agent Skills layout expects helpers under `scripts/`; spec examples are shallow
(`scripts/extract.py`). Staging may use non-spec folders such as `script/`; normalizing to
`scripts/<basename>` avoids carrying those names into the installed tree.

If two skill-adjacent programs in the same part would map to the same `scripts/<basename>`,
fail at plan or validate time with an explicit error (package author must rename one file or
split bundles). This replaces “preserve full relative path” for disambiguation in v1; a later
revision could add optional preserved subpaths if needed.

### Extend the shared skill install planner

Centralise logic in `src/provider/skill/` (`buildSkillInstallProviderActions` or a helper) so
Cursor, Claude, Gemini, and Codex do not fork copy rules.

For each skill-adjacent program in the current part:

- Emit `ProviderAction` entries (likely `raw_file_copy`) using the install path rule above,
  with the same `destinationRoot` (layer vs project) as the other skill actions for that part,
  respecting `SkillInstallPathOptions` for Codex.

- Preserve execute bits with the same policy as `chmodProgramAfterCopy` in
  `copy-package-asset.ts` (extract or share a small helper).

Collision handling: before writing, if any destination path would overlap an existing skill
asset copy for that install (including another synthesized `scripts/<basename>`), abort with
a clear message. Normal reinstall may replace `SKILL.md` and other files the plan already
owns; do not add a blanket “error if skill directory exists” — only fail on **path** clashes
for the same install plan.

### Skip duplicate install in `copyProgramAssetsOnly`

After the provider plan runs, `copyProgramAssetsOnly` should omit rows already installed under
the skill `scripts/` tree. Default is a single location (`scripts/`), not both `bin/` and
`scripts/`, unless dual-install is explicitly chosen later.

### Placeholders and follow-up docs

Review `buildBundleInstallPathMap` and `patchMarkdownBundlePlaceholders` for `{bundle_name}`
(today points at `bin`). Either document `{bundle_name}` as non-skill / true-bin only, or
extend placeholders once `scripts/` paths are stable. Keep the first coding PR small; user
facing doc updates can be a separate pass.

### Removal and safehouse cleanup

`removeProviderSkillBundleTrees` and related safehouse removal must delete `scripts/`
material installed for the package. Confirm provenance `fragmentKey` values cover new paths.

### Validation

`validate-catalog-install-package` (and dev `validate package`) should accept skill-adjacent
programs without requiring a tarball `bin/` layout.

Optional: warn when body text references `bin/` or `{bundle_name}` but executables live only
under `scripts/`.

### Station and user-layer scope

Target behaviour: skill-adjacent program copies are emitted **only** in the same provider
plan pass as the rest of the skill tree, with the **same** `destinationRoot` and roots as
sibling `raw_file_copy` / `plain_markdown_write` skill actions for that part. They must not rely
on `installBinDir` being set.

Implementation check: trace catalog install for `promptScope === "station"` (user layer) and
confirm the skill plan still runs and `layerRoot` points at the agent home (or whatever that
provider already uses for skills). If skill installs are skipped or roots differ today, fix
that path as part of this work so `scripts/` is never “missing” while `SKILL.md` succeeds.

# Risks

#### Wrong classification

Non-skill binaries could be copied into a skill tree, or skill scripts could remain only in
`bin/`. Mitigation: keep the skill-adjacent predicate strict, mirror enrichment bundle roots in
tests, and add integration cases for Multi and legacy Skill packages.

#### Path collisions

Authored files under `scripts/` could clash with synthesized `scripts/<basename>`. Mitigation:
resolve destinations in the planner; on duplicate destination for one install, fail with a
deterministic message before any write.

#### Station and roots

If `layerRoot` / `projectRoot` disagree between program copies and `SKILL.md`, the agent could
load instructions but not find executables. Mitigation: reuse the exact destination root
fields already applied to skill actions in the same plan; add a station-scope smoke install
to **Implementation order**.

# Testing

| Layer       | Focus                                         |
|-------------|-----------------------------------------------|
| Unit        | Planner emits `scripts/` copies; bin unchanged elsewhere. |
| Integration | `atp install` asserts files under `scripts/`. |
| Remove      | Safehouse remove clears `scripts/` payloads.  |

Longer detail: cover planner output, collision detection, and a package similar to
`example-skill-and-script`. Extend or mirror `cursor-agent-provider-skill-install` and
`skill-standard` tests; align with goals in `docs/features/5-installer-providers-for-known-agents.md`.

# Implementation order

1. Pure helpers: detect skill-adjacent programs per part; compute `scripts/<basename>` targets.

2. Extend `buildSkillInstallProviderActions` (or sibling) and share chmod behaviour.

3. Filter `copyProgramAssetsOnly` using handled program paths.

4. Update remove paths and tests.

5. Trace and fix station (user-layer) install if skill plan roots do not match this design.

6. Manual smoke on `example-skill-and-script`; adjust example `skill.md` to reference
   `scripts/<basename>` once behaviour is fixed.

# Success criteria

- Skills with bundle executables match the Agent Skills layout: helpers under `scripts/` next
  to `SKILL.md`.

- No unintended duplicate copies in `bin/` for those same files (unless explicitly decided).

- All providers using `buildSkillInstallProviderActions` pick up the behaviour without
  copy-paste.

- Tests and remove paths cover the new layout.

# Future Considerations


#### Dual install to `bin`

Some users may rely on `PATH` without opening the skill directory. If needed later, consider
`--also-bin`; default remains spec-aligned (`scripts/` only).

#### Optional future: preserved subpaths

If basename-only mapping proves too tight for real packages, revisit installing to
`scripts/<path-relative-to-bundle-root>` for disambiguation, with validation rules for depth and
collisions.
