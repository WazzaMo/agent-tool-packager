# Coding: Cursor rule assembly, provider plan updates, package CLI refactor

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

This note records code and planning-doc updates after [2026-04-04-coding-mcp-json-merge-provider](./2026-04-04-coding-mcp-json-merge-provider.md):

1. Prototype for assembling Cursor `.mdc` rules from YAML + markdown (Feature 5 / file-op 2).

2. Expanded next steps in the installer file-operations and capability-matrix notes.

3. Splitting `registerPackageCommands` into `package-cmd/`.

4. Splitting `part-ops.ts` into `part-authoring/` with a barrel re-export.

5. ESLint (flat config, TypeScript + import rules, size/complexity warnings) with `npm run lint` / `lint:fix` and a line in `AGENTS.md`.

# Cursor rule assembly

Path: `src/file-ops/rule-assembly/`

Implements MD+YAML → `.mdc` for Cursor: frontmatter (`description`, `globs`, `alwaysApply`, …) plus body, with normalised newlines and optional stripping of a pasted `---` … `---` wrapper around the YAML.

| File                  | Role                                |
|-----------------------|-------------------------------------|
| `errors.ts`           | Invalid-input error for empty YAML  |
| `cursor-mdc.ts`       | Normalise + assemble content        |
| `write-cursor-mdc.ts` | Write UTF-8 file; mkdir parents     |
| `index.ts`            | Public exports                      |

Not yet wired into `atp install`; consumption is planned under Next steps in the file-operations note.

# Tests and golden fixture

| Artefact      | Path                                                  |
|---------------|-------------------------------------------------------|
| Golden file   | `test/fixtures/file-ops/cursor-rule-expected.mdc`     |
| Unit tests    | `test/file-ops/cursor-mdc-assembly.test.ts`           |
| Integration   | `test/integration/rule-assembly-cursor-file.test.ts`  |

See [2026-04-04-test-cursor-rule-assembly-scope](./2026-04-04-test-cursor-rule-assembly-scope.md) for test coverage.

# Provider planning documents

### File-operations plan

[2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md)

(1) Next steps list extended to nine items: steps 1–3 done; step 4 (rule assembly) marked in-repo; plus wiring providers into `atp install`, remaining operations, `--force-config` / `--skip-config`, uninstall handlers, and non-goals.

(2) Context text now tracks uninstall there instead of calling it out of scope.

### Capability matrix

[2026-04-03-plan-provider-capability-matrix](./2026-04-03-plan-provider-capability-matrix.md) — bottom Next steps section points at that expanded list.

# Package command registration

Path: `src/commands/package-cmd/`

`registerPackageCommands` in `src/commands/package.ts` delegates to `registerAllPackageCommands` in `package-cmd/register-all.ts`. Submodules register type/part, scalar fields, summary/add, and component/bundle commands. `part-dispatch.ts` routes `package part …` tokens. `manifest-load.ts` holds shared manifest load and exit messaging. The folder name avoids clashing with `package.ts` on disk.

# Multi-part authoring

Path: `src/package/part-authoring/`

The former monolithic `part-ops.ts` is a thin barrel re-exporting: `guards.ts` (manifest checks, index parsing), `newpart.ts`, `usage.ts`, `component.ts`, `bundle.ts` (shared bundle lookup helper), `remove-part.ts`.

# References

- [2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md)

- [2026-04-04-coding-mcp-json-merge-provider](./2026-04-04-coding-mcp-json-merge-provider.md)
