# Test note: standardised skills and Cursor agent provider

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

# Summary

This note summarises automated tests for **Agent Skills** install logic under **`src/provider/skill/`**, **`CursorAgentProvider`** skill routing, and related install plumbing. It complements [2026-04-07-note-standardised-skill-provider](./2026-04-07-note-standardised-skill-provider.md) (implementation) and [2026-04-06-plan-standardised-skill-support](./2026-04-06-plan-standardised-skill-support.md) (requirements).

# Where the tests live

| Area | File(s) | Kind |
|------|---------|------|
| Skill helpers (bundle root, YAML, assembly, placeholders, planner) | `test/provider/skill/skill-standard.test.ts` | Unit |
| Cursor provider (rules, skills, MCP, hooks, remove) | `test/provider/cursor-agent-provider.test.ts` | Unit |
| Catalog install via provider (skills tree) | `test/install/install-package-assets.test.ts` | Unit |
| Provider routing gate | `test/install/catalog-install-agent-provider-routing.test.ts` | Unit |
| Staged part inputs (multi-part Skill paths) | `test/file-ops/part-install-input.test.ts`, `test/integration/part-install-input-pipeline.test.ts` | Unit / integration |
| Full CLI install (fixture package) | `test/integration/install.test.ts` | Integration (spawns **`dist/atp`**) |
| Feature 3 skill install + bundle patching | `test/integration/feature3-package-install-process.test.ts` | Integration |
| Skill partials end-to-end | `test/integration/cursor-agent-provider-skill-install.test.ts` | Integration |
| Legacy flat **`copyPackageAssets`** (not provider path) | `test/install/copy-assets.test.ts` | Unit |

# Skill standard coverage (unit)

**`test/provider/skill/skill-standard.test.ts`** exercises:

- **Path / bundle:** `resolveSkillBundleRoot`, `longestCommonPathPrefix`, `relativeToSkillBundle`.
- **YAML validation:** required **`name`** / **`description`**; max lengths (**64** / **1024** / **500** for compatibility); **`metadata`** string map (valid + invalid); strip **`allowed-tools`**; non-string **`compatibility`**.
- **Assembly:** `assembleSkillMdFromPartials`; `trySplitSkillFrontmatter`.
- **Basenames:** partial **`skill.md`** vs assembled **`SKILL.md`**; **`skill.yml`** alias via **`isSkillYamlBasename`**.
- **`resolvePrimarySkillSource`:** happy paths (**`skill.yaml` + `skill.md`**, **`skill.yml` + `skill.md`**); error paths (yaml-only, partial-only, mix with **`SKILL.md`**, duplicate YAML docs, ambiguous multiple **`.md`**, no markdown/yaml sources, two **`SKILL.md`** trees).
- **Finalise / safety:** `finalizeSkillMdContent` (synthesised frontmatter, path-segment **`name`**); **`assertSafeSkillDirectoryName`**.
- **Placeholders:** `{skill_scripts}/` → **`scripts/`**.
- **Planner:** `buildSkillInstallProviderActions` ( **`SKILL.md` + `raw_file_copy`** ); install-time rejection of oversized **`description`** in staged **`SKILL.md`**.

# Cursor provider coverage (unit)

**`test/provider/cursor-agent-provider.test.ts`** adds skill-specific checks:

- Skill layout **`skills/{name}/SKILL.md`** for a minimal body-only file.
- **Tamper / spec guard:** invalid frontmatter (**`description`** too long) surfaces as **`CursorAgentProvider:`** + underlying message.
- **Path escape:** **`name`** containing **`/`** rejected with **`CursorAgentProvider:`** and **path segments** wording.

Other tests in the same file continue to cover rules, **`bundlePathMap`**, **`.mdc`**, **`mcp.json`**, **`hooks.json`**, **`planRemove`**.

# Integration and install pipeline

- **`cursor-agent-provider-skill-install.test.ts`:** **`atp install`** with **`skill.yaml` + `skill.md`**, extra component file, **`{skill_scripts}`** in body, assert tree under **`.cursor/skills/{name}/`**.
- **`install.test.ts` / `feature3-package-install-process.test.ts`:** project install paths and bundle placeholder behaviour after the **Agent Skills** directory layout change.
- **`install-package-assets.test.ts`:** **`installPackageAssetsForCatalogContext`** with a skill asset through **`CursorAgentProvider`**.

CLI integration tests require **`npm run build`** so **`dist/atp.js`** matches **`src/`** (same expectation as **`ci:test`**).

# Intentionally not covered here

- **Authoring-time** skill validation from [2026-04-06-plan-standardised-skill-support](./2026-04-06-plan-standardised-skill-support.md) (partials only in bundles, markdown references must exist on disk) — not implemented in **`atp validate`**, so no tests yet.
- **Install ambiguity / collision** policy (Feature 5) for skill directories — no dedicated skill tests.
- **`copy-assets.test.ts`** still documents the **legacy** flat **`skills/<file>`** behaviour for **`copyPackageAssets`**; that path is separate from **`CursorAgentProvider` + `src/provider/skill/`**.

# Commands

```bash
npm run test:run
npm run lint
npm run build && npm run test:run   # when validating CLI integration locally
```

# References

- [2026-04-07-note-standardised-skill-provider](./2026-04-07-note-standardised-skill-provider.md)
- [2026-04-06-coding-cursor-agent-provider-install](./2026-04-06-coding-cursor-agent-provider-install.md)
- [2026-04-06-test-cursor-agent-provider-and-hooks-merge](./2026-04-06-test-cursor-agent-provider-and-hooks-merge.md)
