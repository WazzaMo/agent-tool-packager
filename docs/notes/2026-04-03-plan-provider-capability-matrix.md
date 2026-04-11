# Plan: Provider capability matrix (step 1)

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

## Scope

This note **freezes step 1** from
[2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md):
for each **agent × part type**, which **file-level operations** (by ID from that
note) a provider must support. Source product mapping:
[Feature 5 — Installer providers for known agents](../features/5-installer-providers-for-known-agents.md).

## How to read the matrix

### Column definitions

| Term | Meaning |
|------|---------|
| Req | Required for ATP “full” support when Feature 5 marks the cell **Y**. |
| Opt | Optional or policy-driven (layer, user vs project). |
| Conv | Convention only; ATP may ship a pattern (e.g. `installed-prompts/`). |
| Def | Deferred (**TBD** in Feature 5, or **Partial** where ATP defers). |
| F5 | Feature 5 support level for that cell (**Y**, **Partial**, **TBD**). |

Operation **IDs** match sections 1–12 in the file-operations plan.

### Default install layer

Default install layer is **project** unless noted. User or global layers are **Opt** and depend on `atp install` and config policy.

## Operation ID legend

| ID | Short name              |
|----|-------------------------|
|  1 | Config merge            |
|  2 | Rule assembly           |
|  3 | Tree materialise        |
|  4 | Markdown aggregate      |
|  5 | Plain markdown emit     |
|  6 | TOML command generate   |
|  7 | Hook JSON graph         |
|  8 | Settings nested merge   |
|  9 | Executable install      |
| 10 | Interpolation validate  |
| 11 | Discovery hint          |
| 12 | Experimental drop       |

### What each operation covers (IDs 1–6)

#### ID 1 — Config merge

Create or amend JSON or TOML registry files.

#### ID 2 — Rule assembly

Markdown + YAML → `.mdc` / `.md` with frontmatter.

#### ID 3 — Tree materialise

Copy or sync directory trees (skills, scripts, assets).

#### ID 4 — Markdown aggregate

Patch, append, or import for layered instruction files.

#### ID 5 — Plain markdown emit

Write `.md` body only (no YAML assembly step).

#### ID 6 — TOML command generate

Gemini-style `.toml` custom commands.

### What each operation covers (IDs 7–12)

#### ID 7 — Hook JSON graph

Merge `hooks.json` event → handler arrays.

#### ID 8 — Settings nested merge

Merge `hooks` / `mcpServers` inside `settings.json`.

#### ID 9 — Executable install

Install scripts or binaries and set execute bit.

#### ID 10 — Interpolation validate

Normalise or validate env/path placeholders in config.

#### ID 11 — Discovery hint

Small pointer edits in `AGENTS.md` or similar.

#### ID 12 — Experimental drop

Configurable opaque or schema-light install.

## Capabilities by agent

### Cursor

| Part         | F5      | Req     | Opt   |
|--------------|---------|---------|-------|
| Rule         | Y       | 2, 3    | 5, 11 |
| Prompt       | Partial | —       | 3, 11 |
| Skill        | Y       | 3       | —     |
| Hook         | Y       | 7, 3, 9 | 1, 10 |
| Mcp          | Y       | 1, 10   | —     |
| Command      | Partial | 3       | 11    |
| Experimental | TBD     | —       | 12    |

#### Rule

`.md` or `.mdc` under `.cursor/rules/`; `AGENTS.md` uses op **5** or **4**.

#### Prompt

Convention: `installed-prompts/`. MCP Prompts live on servers, not op **1**.

#### Skill

`.cursor/skills/` plus compat paths from Feature 5.

#### Hook

Project `.cursor/hooks.json`. Enterprise/team layers **Def** for now.

#### Mcp

`.cursor/mcp.json` at project; global path **Opt**.

#### Command

Prefer skill materialisation; slash UX is not an on-disk format.

#### Experimental

**Def** until Cursor documents a stable surface.

### Claude Code

| Part         | F5      | Req     | Opt   |
|--------------|---------|---------|-------|
| Rule         | Y       | 2, 3    | 4, 5  |
| Prompt       | Partial | —       | 11    |
| Skill        | Y       | 3       | —     |
| Hook         | Y       | 8, 3, 9 | 1, 10 |
| Mcp          | Y       | 1, 10   | —     |
| Command      | Y       | 3       | —     |
| Experimental | TBD     | —       | 12    |

#### Rule

`.claude/rules/`; `CLAUDE.md` stacks use **4** or **5**.

#### Prompt

Convention only; MCP and `@` are out of band.

#### Skill

`.claude/skills/<name>/`.

#### Hook

`hooks` in `settings.json`; scripts under `.claude/hooks/`.

#### Mcp

`.mcp.json` and `~/.claude.json`; second path **Opt** by layer.

#### Command

`.claude/commands/<name>.md`.

#### Experimental

Teams/plugins **Def** until scoped.

### Gemini CLI

| Part         | F5      | Req     | Opt |
|--------------|---------|---------|-----|
| Rule         | Y       | 2, 3, 4 | 5   |
| Prompt       | Partial | 6       | 11  |
| Skill        | Y       | 3       | —   |
| Hook         | Y       | 8, 3, 9 | 10  |
| Mcp          | Y       | 8, 10   | —   |
| Command      | Y       | 6       | —   |
| Experimental | TBD     | —       | 12  |

#### Rule

`GEMINI.md` hierarchy and `@path`; extra names via `settings.json` **Opt**.

#### Prompt

On-disk prompts via custom commands (op **6**); chat/MCP otherwise.

#### Skill

`.gemini/skills/` only for ATP `GeminiAgentProvider` project installs (not `.agents/skills/`).

#### Hook

`hooks` in merged `settings.json`.

#### Mcp

`mcpServers` and optional `mcp` allow/deny in the same file.

#### Command

`.gemini/commands/*.toml`.

#### Experimental

Subagents/plan mode **Def**.

### Codex CLI

| Part         | F5      | Req     | Opt   |
|--------------|---------|---------|-------|
| Rule         | Y       | 3, 4, 5 | 11    |
| Prompt       | Partial | —       | 11    |
| Skill        | Y       | 3       | —     |
| Hook         | Partial | 7, 3, 9 | 1, 10 |
| Mcp          | Y       | 1, 10   | —     |
| Command      | Partial | 3       | 11    |
| Experimental | TBD     | —       | 12    |

#### Rule

`AGENTS.md` discovery, size caps, `config.toml` fallbacks.

#### Prompt

Session, `@`, MCP; optional prompts dir **Opt**.

#### Skill

`.agents/skills/`; include `agents/openai.yaml` when present.

#### Hook

Ops **7**, **3**, **9** when hooks enabled; op **1** for `codex_hooks` **Opt**.

#### Mcp

Packaged JSON `mcpServers` merges into project `.codex/config.toml` as `[mcp_servers.<name>]` (TOML merge in ATP). Official Codex storage remains `config.toml`-based.

#### Command

No user slash file format; skills carry workflows.

#### Experimental

Hooks/subagents maturity **Def**.

## Consolidated view (required operations only)

IDs that must exist for a **complete** provider set (**Def** rows excluded). Long-form detail follows the table.

| ID | Detail |
|----|--------|
|  1 | C1     |
|  2 | C2     |
|  3 | C3     |
|  4 | C4     |
|  5 | C5     |
|  6 | C6     |
|  7 | C7     |
|  8 | C8     |
|  9 | C9     |
| 10 | C10    |
| 11 | C11    |
| 12 | C12    |

### C1

**cursor:Mcp**, **claude:Mcp**, **codex:Mcp** (Codex uses `config.toml` `mcp_servers`; others JSON). **codex:Hook** as **Opt**: `codex_hooks` in `config.toml` is not automated yet; hooks payload remains `hooks.json`.

### C2

**cursor:Rule**, **claude:Rule**, **gemini:Rule**.

### C3

All agents for **Rule**, **Skill**, **Hook**, **Command** where F5 is **Y** or **Partial** (per matrix).

### C4

**gemini:Rule**, **codex:Rule**; **claude:Rule** and **cursor:Rule** (**Opt**, via `AGENTS.md`).

### C5

**codex:Rule**; **cursor:Rule** and **claude:Rule** as **Opt**.

### C6

**gemini:Prompt** (convention) and **gemini:Command**.

### C7

**cursor:Hook**, **codex:Hook**.

### C8

**claude:Hook**, **claude:Mcp**; **gemini:Hook**, **gemini:Mcp**.

### C9

**cursor**, **claude**, **gemini**, **codex** **Hook** rows.

### C10

All **Mcp** rows; **Hook** rows where command paths use expansion.

### C11

**Partial** **Prompt** / **Command**; optional **Rule** ergonomics.

### C12

**Experimental** rows (**Def** until specified).

## Open decisions

The numbered questions below reference operation IDs; answers are under **Recorded answers**.

### Questions

1. Layer policy: which project vs user vs global combinations does ATP v1 support (Feature 5 lists many layers)?

2. Single vs multi provider: one module per agent vs part-strategy objects composed per agent?

3. Codex hooks: is op **1** **Req** when installing Hook parts, or document-only until hooks leave experimental?

4. Cursor rule: default **2** → `.mdc` vs **5** → `.md` when the package is markdown-only?

5. Idempotency key: one namespace per (agent, layer, path, logical entry) shared across **1**, **7**, **8**?

### Recorded answers

#### Layer policy

There are really only two layers of installation: packages go to a project Safehouse or the user’s Station. Project Safehouse is the early focus (least-risk choice).

Capabilities are separate from layering: unpack/copy, amend JSON or TOML for MCP or hooks, etc. Those capabilities must work reliably regardless of layer.

#### Single versus multi provider

One Safehouse or Station install targets one configured agent. Station’s association with a particular agent is less defined; project Safehouse is the priority.

Installation is single-provider at a time. If the user switches agents after install, conversion may mean uninstall and reinstall for the new agent.

#### Codex hooks (op 1 as config merge)

Codex hooks need feature flags in `config.toml` and `hooks.json`. See [Codex Hooks](https://developers.openai.com/codex/hooks).

Treat hooks as supported; do not treat as experimental. The product should warn if `config.toml` has hooks disabled before install and let the user decide (they stay in control).

#### Cursor rules (.mdc vs .md) and authoring validation (see **4.10**)

Markdown-only implies missing YAML front matter. Extend **package validation** (authoring time) so failures are explicit.

Rules and skills that use YAML front matter may be authored as **one file** (body + `---` front matter in the same `.md`) or as **two files** with the same basename: `x.md` plus `x.yaml` or `x.yml` for the front matter. Validation should accept both layouts, require consistency when both shapes appear, and report clear errors when front matter is missing or mismatched. Cursor treats `.md` and `.mdc` similarly; missing front matter means the rule is not used.

#### Install-time validation (tampering / pre-flight)

**Install-time validation (implemented as **5.5**):** immediately before `installPackageAssetsForCatalogContext` (catalog install and reinstall), `validateCatalogInstallPackage` runs on the extracted catalog directory. This is the **install integration** for “validate package” semantics: same manifest and staging checks as `atp validate package`, with **scope limited to the catalog package directory and what `installPackageAssetsForCatalogContext` / providers consume** (on-disk files instead of `stage.tar`; optional `assets` sweep; **4.10** rule/skill YAML via `collectCatalogInstallRuleSkillViolations`). Invalid or tampered packages fail fast with no provider plan or file writes. Target agent merge ambiguity remains apply-time (`--force-config` / `--skip-config`). See [Developer and install-time validation](../features/1-package-definition-and-installation.md#developer-and-install-time-validation).

#### Idempotency and CLI overrides

Safe configuration updates are critical. If an MCP server is already registered, do not duplicate it; prove uniqueness per install target.

On ambiguity, explain the situation and offer **`--force-config`** (apply) and **`--skip-config`** (skip merges). Keep that logic in the agent provider.

## Implementation checklist

Progress against
[2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md).

- `[x]` = done in the repo at last alignment; `[ ]` = not done.

Last aligned with the repo: **2026-04-11** (Feature 5 providers for catalog install; Codex MCP TOML merge; journal rollback for `.toml`; **4.10** authoring + **5.5** pre-install rule/skill validation).

### 1 Capability matrix (this document)

- [x] **1.1** Per-agent tables (Cursor, Claude Code, Gemini CLI, Codex CLI) with **F5** / **Req** / **Opt**.

- [x] **1.2** Operation ID legend (IDs **1–12**), short summaries, consolidated **C1–C12** view.

- [x] **1.3** Per-agent notes (paths, layers, deferred **Def** items).

- [x] **1.4** Open decisions recorded and answered (layer vs capability, single provider per install, Codex hooks + `config.toml`, Cursor rule packaging + `.md`/`.mdc`, idempotency + `--force-config` / `--skip-config`).

### 2 Internal DTOs

- [x] **2.1** `OperationIds` / `OperationId` in code: `src/file-ops/operation-ids.ts` (numeric **1–12**, JSDoc per constant).

- [x] **2.2** DTO contract written up: `InstallContext`, `AtpProvenance`, `ProviderPlan`, `ProviderAction` union and per-op payloads in [2026-04-03-plan-provider-internal-dtos](./2026-04-03-plan-provider-internal-dtos.md).

- [x] **2.3** Core provider DTOs in `src/provider/provider-dtos.ts` (`ProviderPlan`, `ProviderAction` discriminated union including `mcp_codex_config_toml_merge`, `AtpProvenance`, per-action fields). The internal DTO note may still describe extras not in TypeScript.

### 3 Config merge prototype — `mcpServers` in JSON (ops **1** / **8**)

- [x] **3.1** Merge engine: `mergeMcpJsonDocument` / `mergeMcpServerRecordsByName` (exported for reuse) with idempotency and ambiguity detection (`src/file-ops/mcp-merge/mcp-json-merge.ts`).

- [x] **3.2** User guidance in the merge API: `forceConfig`, `skipConfig` (aligned with open decisions).

- [x] **3.3** JSON shape helpers and cloning: `src/file-ops/mcp-merge/mcp-json-helpers.ts`.

- [x] **3.4** Read/write adapter: `applyMcpJsonMergeToFile` (`src/file-ops/mcp-merge/apply-mcp-json-merge.ts`).

- [x] **3.5** Typed errors: ambiguous merge, invalid document, invalid payload (`src/file-ops/mcp-merge/errors.ts`).

- [x] **3.6** Unit tests: `test/file-ops/mcp-json-merge.test.ts`.

- [x] **3.7** Integration tests: `test/integration/mcp-json-merge-files.test.ts`.

- [x] **3.8** Additional JSON merge strategies from the DTO note: `deep_assign_paths` and `replace_at_pointer` via `mergeJsonDocumentWithStrategy` (`src/file-ops/json-merge/`). **`json_document_strategy_merge`** is wired in **`applyProviderPlan`**; Cursor / Claude / Gemini MCP parts may include optional **`atpJsonDocumentStrategy`** in staged JSON (see `provider-mcp-staged-json.ts`). Standard `{ mcpServers }` installs still use **`mcp_json_merge`** / **`mergeMcpJsonDocument`** (ambiguity rules).

- [x] **3.9** Codex MCP TOML (op **1**): `mergeCodexConfigTomlMcp`, journal + rollback for `.codex/config.toml`, provider action `mcp_codex_config_toml_merge` (`src/file-ops/mcp-merge/mcp-codex-toml-merge.ts`; tests in `test/file-ops/mcp-codex-toml-merge.test.ts` and config journal tests). Legacy `copyPackageAsset` merges MCP into `config.toml` when the agent base is `.codex/`.

- [ ] **3.10** Remaining TOML op **1** scope: `[features]` (e.g. `codex_hooks`) and interactive warnings before toggling hook-related flags in `config.toml`.

### 4 Rule assembly (op **2**)

Cursor **MD+YAML → `.mdc`** (**4.1–4.6**) is done; **4.7–4.9** extend install-time rule handling. **4.10** (**authoring-time**, `atp validate package` / package dev workflow) is done: rules and skills with YAML as one file or paired `x.md` + `x.yaml` or `x.yml`. Installs use step **5** wire-up; **5.5** pre-install rule/skill validation matches **4.10** before apply.

- [x] **4.1** Cursor `.mdc` assembly (`src/file-ops/rule-assembly/cursor-mdc.ts`).

- [x] **4.2** Disk writer (`src/file-ops/rule-assembly/write-cursor-mdc.ts`).

- [x] **4.3** Input errors: `RuleAssemblyInvalidInputError` (`src/file-ops/rule-assembly/errors.ts`).

- [x] **4.4** Barrel exports: `src/file-ops/rule-assembly/index.ts`.

- [x] **4.5** Unit tests + golden fixture: `test/file-ops/cursor-mdc-assembly.test.ts`, `test/fixtures/file-ops/cursor-rule-expected.mdc`.

- [x] **4.6** Integration test: `test/integration/rule-assembly-cursor-file.test.ts`.

- [x] **4.7** Cursor `.md` rules: `materializeRuleLike` passes `.md` as op **5** (`PlainMarkdownEmit`); `.mdc` with YAML `---` uses op **2** (`RuleAssembly`) via `src/provider/rule-like-materialize.ts`.

- [x] **4.8** Claude Code rules under `.claude/rules/`: same `materializeRuleLike` path for `.md` / `.mdc` in `ClaudeAgentProvider` installs. Non-`.toml` rule installs also append a stable managed block to project-root `CLAUDE.md` (op **4**, **6.2**).

- [x] **4.9** Gemini / Codex rule installs: `GeminiAgentProvider` / `CodexAgentProvider` use `materializeRuleLike` + `plain_markdown_write` (Gemini layout per agent; Codex `.codex/rules/`). Non-`.toml` rules also get op **4** `markdown_managed_block_patch` to `GEMINI.md` / `AGENTS.md` (**6.2**). Cursor rule installs remain op **5** only (no project-root aggregate patch in this pass).

- [x] **4.10** Package validation (**authoring time**): rules and skills with YAML front matter—either a **single** `.md` (embedded `---` front matter) or **paired** files `x.md` + `x.yaml` or `x.yml` (same basename). Integrated into `atp validate package` (and related package-dev checks) with clear errors for missing, duplicated, or inconsistent front matter (`src/package/validate-rule-skill-frontmatter.ts`). **5.5** reuses the same rule/skill checks on the staged install payload before apply.

### 5 Wire providers into `atp install`

- [x] **5.1** Agent from Safehouse + Station `agent-paths`; routing in `src/install/catalog-install-agent-provider-routing.ts` (Cursor / Gemini / Claude / Codex vs legacy `copyPackageAssets`).

- [x] **5.2** `StagedPartInstallInput` per part → `planInstall` → `ProviderPlan.actions` (`src/install/install-package-assets.ts`).

- [x] **5.3** `applyProviderPlan` runs actions; programs via `copyProgramAssetsOnly`; Feature 4 multi-part staging feeds the loop.

- [x] **5.4** Integration tests: per-agent rule/skill/MCP/hooks and journal rollback (e.g. `test/integration/cursor-agent-provider-rule-install.test.ts`, `config-merge-journal-install*.test.ts`, `codex-agent-provider-rule-install.test.ts`).

- [x] **5.5** **Pre-install validation:** `validateCatalogInstallPackage` (`src/package/validate-catalog-install-package.ts`) mirrors `validatePackage` for catalog extract layout (manifest structure, Multi/legacy conflicts, staged files on disk vs `parts`/root `components` & `bundles`, optional `assets` path sweep, **4.10** rule/skill YAML via `collectCatalogInstallRuleSkillViolations`) **before** `installPackageAssetsForCatalogContext` (`src/install/catalog-install-execute.ts`); same on reinstall (`src/install/reinstall.ts`). Re-exported from `validate.ts`. **CLI:** `atp validate catalog-package [dir]`. Fails install with no merges or copies when checks fail.

### 6 Remaining file operations (matrix-driven)

- [x] **6.1** Op **3** — `TreeMaterialise`: per-file `raw_file_copy` for hook scripts, skill bundles, prompts, and other non-merge assets. Full directory sync beyond per-asset copies: **[ ]**.

- [x] **6.2** Op **4** — markdown aggregate / managed-block patch: `markdown_managed_block_patch` in `apply-provider-plan` (`applyMarkdownManagedBlockPatchAction`), markers + `applyManagedBlockToText` (`src/file-ops/markdown-merge/`). Gemini / Claude / Codex rule installs (non-`.toml`) append a bullet + link into `GEMINI.md` / `CLAUDE.md` / `AGENTS.md` via `rule-project-aggregate-md.ts`. Uninstall does not strip aggregate blocks yet.

- [x] **6.3** Op **5** — `plain_markdown_write` for `.md` rules, skills, prompts, and passthrough rule-like content (`materializeRuleLike` when not `.mdc` assembly).

- [x] **6.4** Op **6** — Gemini `.toml` commands: packaged files copy to `.gemini/commands/` (`copy-asset-support.ts` / `GeminiAgentProvider`); no separate generator beyond staging + copy.

- [x] **6.5** Op **7** — `hooks_json_merge` for Cursor (`.cursor/hooks.json`), Codex (`.codex/hooks.json`), Claude (`settings.json` hook slice); Gemini hooks in `settings.json`.

- [x] **6.6** Op **8** — `mcp_json_merge` / nested `settings.json` for Gemini (`mcpServers` + hooks); Claude project `.mcp.json` / user `~/.claude.json`.

- [ ] **6.7** Op **9** — `program` assets copy to configured bin dirs (`copyProgramAssetsOnly` / `copyPackageAsset`); explicit `chmod +x` in codebase **[ ]** (may follow source modes).

- [ ] **6.8** Op **10** — interpolation validate / normalise for MCP and hooks (beyond markdown placeholder patching).

- [ ] **6.9** Op **11** — discovery hints (`AGENTS.md` bullets, etc.).

- [ ] **6.10** Op **12** — experimental / opaque drops (`delete_managed_file` exists for `planRemove`; general op **12** coverage **[ ]**).

### 7 User control on the CLI

- [x] **7.1** `--force-config` / `--skip-config` on `atp install` (`src/commands/install.ts`; mutually exclusive).

- [x] **7.2** Flags via `InstallOptions` → `installPackageAssetsForCatalogContext` / `copyPackageAsset` merge options → `applyProviderPlan` / `mcpMergeOptionsFromProvider`.

- [x] **7.3** README, `docs/configuration.md`, Feature 5 merge policy (`docs/features/5-installer-providers-for-known-agents.md`).

### 8 Uninstall support in providers

- [x] **8.1** `configMergeJournal` records MCP/hooks fragments; `rollbackMergedConfigJournal` restores JSON or `.toml` (Codex `config.toml`); `AtpProvenance.fragmentKey` for targeted removes.

- [x] **8.2** `removeAgentCopies`, journal rollback, MCP/hooks fragment strip, provider skill bundle removal (including Codex `.agents/skills/`); `planRemove` + `delete_managed_file` for single files.

- [x] **8.3** `atp remove safehouse` loads journals and rolls back merged config (`src/remove/remove-safehouse.ts`). Station remove follows the same patterns where applicable.

### 9 Non-goals and deferred layers

- [ ] **9.1** Document non-goals (e.g. Team/Enterprise-only Cursor paths) until ATP scopes those layers.

## Next steps

See [2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md).

**Done in-repo:** MCP JSON merge (**3**), Codex MCP TOML merge (**3.9**), Cursor MD+YAML → `.mdc` (**4.1–4.6**), package validation for rules/skills YAML (**4.10**), pre-install rule/skill validation (**5.5**), provider wire-up for catalog `atp install` (**5**), matrix ops **6.1** (partial), **6.2** (op **4** aggregate for Gemini / Claude / Codex rule installs), **6.3–6.6**, CLI `--force-config` / `--skip-config` (**7**), safehouse merge rollback (**8**).

**Still open:** explicit executable `+x` (**6.7**), interpolation validate (**6.8**), discovery hints (**6.9**), broader op **12** (**6.10**), non-goals doc (**9**), Codex `[features]` / hooks-enablement (**3.10**).
