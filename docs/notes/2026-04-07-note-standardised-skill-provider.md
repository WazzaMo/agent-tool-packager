# Coding note: standardised skill provider (`src/provider/skill`)

## Context

ATP needs one place for [Agent Skills](https://agentskills.io/specification)-aligned install behaviour so every `AgentProvider` can reuse the same parsing, validation, and filesystem plan. This note summarises the implementation that landed in April 2026 and how `CursorAgentProvider` exercises it.

Related design notes:

- [2026-04-06-plan-standardised-skill-support.md](./2026-04-06-plan-standardised-skill-support.md)
- [Feature 5 — Installer providers](../features/5-installer-providers-for-known-agents.md) (skills matrix and `AgentProvider` shape)

## What was built

### Module: `src/provider/skill/`

Shared, mostly pure helpers plus one planner that emits existing `ProviderAction` values:

- **Split / assemble:** `trySplitSkillFrontmatter`, `assembleSkillMdFromPartials` — support pre-assembled `SKILL.md` or authoring split `skill.yaml` / `skill.yml` + `skill.md`.
- **Normalisation:** `normaliseSkillYamlDocument`, `serialiseSkillFrontmatterYaml`, `skillNameFromNormalisedFrontmatter` — enforce spec-oriented limits (`name`, `description`, `compatibility`, `metadata` string map), strip experimental `allowed-tools` for now.
- **Bundle paths:** `resolveSkillBundleRoot`, `longestCommonPathPrefix`, `relativeToSkillBundle`, `toPosixPath` — locate the staged “bundle” directory for all `skill` assets in one part.
- **Primary source:** `resolvePrimarySkillSource` — chooses among assembled `SKILL.md` (basename rules: `SKILL.md` vs exact `skill.md` partial), partial pair, or a single legacy `.md`; returns consumed staging paths for files that must not be copied again.
- **Finalise:** `finalizeSkillMdContent` — re-serialises validated frontmatter; if there is no YAML block, synthesises minimal `name` / `description` using manifest / basename fallback (backward compatible with packages that ship body-only markdown).
- **Placeholders:** `patchSkillScriptsPlaceholder` — `{skill_scripts}/` → `scripts/` after assembly.
- **Plan:** `buildSkillInstallProviderActions` — produces `plain_markdown_write` for `skills/{skill-name}/SKILL.md` and `raw_file_copy` for every other staged skill file under the same bundle root (scripts, assets, etc.).

Public barrel: `src/provider/skill/index.ts`.

### Cursor wiring

`CursorAgentProvider.planInstall` routes all manifest rows with `type: skill` through `buildSkillInstallProviderActions` before the existing rule/prompt/MCP/hook logic. `SkillFrontmatterError` is wrapped with a `CursorAgentProvider:` prefix for clearer CLI-facing messages.

Skill markdown still passes through `patchMarkdownBundlePlaceholders` (bundle install paths) and `materializeRuleLikeForCursor` only affects `.mdc`-style rule assembly; skills use `SKILL.md` and stay on the plain-markdown / rule-assembly path as appropriate.

## Behaviour change (Cursor project install)

Previously, a skill asset landed as a **flat** file under `.cursor/skills/<basename>`. Installs now follow the on-disk skill layout:

```text
.cursor/skills/{skill-name}/SKILL.md
.cursor/skills/{skill-name}/…   # other staged skill files, tree preserved under bundle root
```

`{skill-name}` comes from validated YAML `name` when present; otherwise from the synthesised or fallback naming path described above.

Legacy **`copyPackageAssets`** (non–Cursor-provider path) was left unchanged; only the Cursor provider pipeline uses the new layout.

## Tests

- **Unit:** `test/provider/skill/skill-standard.test.ts` — bundle root math, YAML validation, assembly, placeholders, finalise, planner output shape, `resolvePrimarySkillSource` with a temp staging tree.
- **Integration:** `test/integration/cursor-agent-provider-skill-install.test.ts` — full `atp install` with `skill.yaml` + `skill.md` + an extra file (flat component layout in tarball).
- **Adjusted expectations:** provider unit test, `install-package-assets`, `install` fixture paths, Feature 3 skill tests (including a `description` field where frontmatter is required for validation).

Integration tests that spawn the CLI depend on **`npm run build`** so `dist/atp.js` matches `src/`.

## Follow-ups (optional)

- Parameterise the skills **subdir** when providers differ (e.g. Codex uses **`.agents/skills/`**; **Gemini ATP** uses **`.gemini/skills/`** under **`layerRoot`**; Cursor **`.cursor/skills/`**).
- Authoring-time validation (package validate) can call the same normalisers to fail fast before catalog publish.
- If multi-skill-per-part layouts appear in the wild, extend grouping beyond “one bundle root per part” of skill assets.
