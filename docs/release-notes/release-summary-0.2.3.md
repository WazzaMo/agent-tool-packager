# 0.2.3 Release — 2026-04-21

Release summary for [0.2.3-Release-2026-04-21.md](./0.2.3-Release-2026-04-21.md). Each section below condenses the matching heading in that note.

# Summary

This release merges multi-part packaging (one catalog package, many staged parts under `stage.tar`), per-agent install policies with merge safety, catalog and Safehouse UX changes—including required Safehouse agent, richer `atp catalog remove`, duplicate part types without noisy validation, optional npm drift hints and `atp --latest`—and bundle authoring enhancements such as `--skip-exec` and bundles sourced outside the package tree.

## Rigorous Manual Test Scope

Manual validation focused on Cursor and Gemini with packaged skills; Claude and Codex paths exist but were not exercised the same way, so regressions there should be reported via GitHub issues.

## Package installation requires a configured Safehouse

Catalog install and Safehouse removal now insist on an explicit `.atp_safehouse` agent assignment (`atp agent <name>` after init); blank agent no longer defaults to Cursor. User catalog removal can delete Station user rows and `user_packages/` with guards against orphaned installs unless `--from-catalog-only` or `--and-from-projects` is used, and duplicate part types are accepted without validation warnings.

# CLI self-version check

After startup, ATP can compare the running CLI semver to npm `latest`, emit an occasional stderr hint when newer, throttle checks via a Station file, respect skip env vars and dev builds, support mirror registry base URL config, and offer standalone `atp --latest` for an explicit comparison.

# Multi-type packages

## Intent and compatibility

Multi-type lets one catalog entry ship several agent-facing slices (skills, MCP, hooks, etc.) in order; legacy single-root manifests remain supported without automatic migration—authors reshape content manually when adopting Multi.

## Authoring and staging

New and extended `atp package` subcommands append and edit parts, enforce unique bundle and component names across Multi packages, stage under `part_{index}_{Type}/`, allow switching manifest `type` when rules permit, and document idempotent bundle re-adds.

### Data-only bundles (`--skip-exec`)

Bundles that ship no executables can use `--skip-exec` so the tree is staged and published but omits executable catalog assets—useful for config-only MCP trees; it cannot combine with `--exec-filter`.

### Skill bundles and catalog `assets`

Catalog enrichment walks Skill bundles to emit `skill` asset rows so typical skill layouts install without enumerating every file under components, while `--skip-exec` still suppresses program rows only.

### Bundle directories outside the package (relative and absolute sources)

Bundle sources may live outside the package directory using the same resolution as components; manifest `path` records relative paths in-tree or basename out-of-tree, and remove commands key off manifest data without needing the original directory on disk.

## Validation, summary, and catalog

`validate package` and `package summary` follow Multi vs legacy rules; catalog add validates first and prefixes assets like the tarball; `atp catalog remove` behavior for user packages matches the guarded Station and Safehouse story above.

## Install, removal, and listing

Install walks all Multi parts with best-effort rollback on partial failure, requires configured Safehouse agent for install/remove catalog paths, removes whole packages only at safehouse/station scopes, distinguishes catalog remove from install removal, and extends list commands with Multi part-kind summaries—with stricter YAML error handling on some paths.

# Per-agent installation

## Intent and scope

Each agent product maps part kinds to different on-disk contracts; MCP and hooks often merge into host files and stop on ambiguous diffs unless the operator forces or skips structured merges.

## Pipeline and agent selection

Staging feeds normalized part handles into providers; `InstallContext` carries agent id, scopes, roots, and extracts; unknown agent ids fail at assign time; installs and removes share the same non-defaulting Safehouse agent read path.

## Agent behaviour in this release (project install)

Project installs for Cursor, Gemini, Codex, and Claude route rules, prompts, skills, hooks, MCP, and related markdown through each product’s conventions, including Gemini TOML/JSON merges, Codex `config.toml` and optional hooks enablement conflicts, Claude `.mcp.json` and settings merges, plus shared Agent Skills discipline where applicable.

## Operator controls

Conflicting MCP or hook merges yield actionable stderr (`--verbose`/`DEBUG` can add JSON); `--force-config` and `--skip-config` are mutually exclusive toggles for how merges apply during install.

## Recursive payloads and rollback

Recursive directory copies and structured merges record provenance journals so Safehouse removal can unwind ATP-owned fragments—including Codex feature flags—without wiping unrelated user content.

## Documented non-goals

Enterprise rule sources, team hook tiers, and full parity of user-global vs project install behavior remain explicitly out of scope for this release.

# Package manifest rules (0.2.3 schema)

Root package metadata retains familiar fields while defaulting root `type` to Multi with required non-empty `parts`; single-kind legacy manifests forbid populated `parts`, and parts repeat the established bundle shapes including `skip-exec`; catalog MCP/Hook merges follow agent-specific installer rules.

# Contributing new or changed AgentProvider code

Providers implement planning vs apply vs removal with discriminated actions, provenance for rollback, merge options threaded from CLI flags, shared merge helper usage for clearer ambiguity labels, and tests covering plan shapes plus CLI-driven integration setups when adding agents.

# Tests and code style

Automated tests span Multi authoring, catalog remove variants, guardrails on Safehouse agent, multi-agent installs, merge conflicts, external paths, enrichment and update-check behavior, duplicate part types, and related notes; JSDoc and helper refactors swept `src/` without intended CLI churn.
