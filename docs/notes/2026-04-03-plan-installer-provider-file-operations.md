# Plan: Installer provider file-level operations

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

This note derives tactical **file-level operations** from
[Feature 5 — Installer providers for known agents](../features/5-installer-providers-for-known-agents.md).
The goal is a vocabulary of operations providers can compose so installed
package parts are recognised by each agent’s discovery and config rules.

# Context

Feature 5 maps agents, part types, and targets (`mcp.json`, `hooks.json`,
`settings.json`, `config.toml`, markdown trees, skill layouts, etc.). Providers
must choose **where** to write and **how** to merge without breaking user-owned
config. Many surfaces need **create-if-missing** and **amend-if-present**
behaviour, with clear idempotency and uninstall semantics (out of scope here but
constrained by operation design).

# Operation categories

## 1. Structured config: create or amend (JSON / TOML)

**Intent:** Ensure agent config files exist and contain entries so new parts
(MCP, hooks, feature flags) are registered.

| Aspect        | Detail                                              |
|---------------|-----------------------------------------------------|
| Typical files | `mcp.json`, `hooks.json`, `settings.json` slices   |
| Also          | Codex `config.toml` (`[mcp_servers.*]`, `[features]`) |
| Behaviour     | Parse → merge → serialize; preserve unrelated keys   |
| Risks         | Schema/version (`hooks.json` `"version": 1`), collisions on server names |

**Agent-specific examples (from Feature 5):**

- **Cursor:** `.cursor/mcp.json` / `~/.cursor/mcp.json` (`mcpServers`); project
  `.cursor/hooks.json` (and user/global layers where ATP supports them).

- **Claude Code:** `.mcp.json` / `~/.claude.json`; `hooks` inside
  `settings.json` (user, project, local, managed, plugins).

- **Gemini CLI:** `mcpServers` and `hooks` in merged `settings.json` layers.

- **Codex CLI:** `[mcp_servers.<name>]` in `config.toml`; optional `hooks.json`
  when `codex_hooks` is enabled; may need to set or document `[features]`
  toggles.

**Sub-operations to specify in implementation:**

- Deep-merge vs replace-by-key for named entries (MCP server name as key).

- Ordering and precedence when multiple layers exist (local vs project vs user).

- Validation after merge (required fields per transport: stdio, HTTP, etc.).

## 2. Rule assembly: Markdown + YAML → agent-specific rule file

**Intent:** Package **Rule** parts as portable sources (body markdown + YAML
metadata) and **assemble** the artefact each agent expects.

| Agent   | Example output        | Notes from Feature 5                          |
|---------|-----------------------|-----------------------------------------------|
| Cursor  | `.mdc` under rules    | Frontmatter: `description`, `globs`, `alwaysApply` |
| Claude  | `.md` under rules     | Optional YAML `paths` frontmatter             |
| Others  | `.md` or root files   | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` patterns |

**Core operation:** Take a **markdown base** (rule body) and a **YAML base**
(metadata), produce a single file (for example `*.mdc` or `*.md`) with correct
concatenation order, delimiter (`---`), encoding, and field names for that
agent.

**Risks:** Cursor `.md` vs `.mdc` choice; escaping; duplicate rule names;
conflict with hand-edited rules on reinstall.

# Additional tactical operations

## 3. Directory tree materialisation (copy or sync)

**Intent:** Lay down files that agents discover by path only (no central
registry).

Examples:

- **Skill:** Copy package tree to `<skill-name>/` with `SKILL.md` and optional
  `scripts/`, `references/`, `assets/` (and agent-specific extras such as
  `agents/openai.yaml` for Codex).

- **Command:** Copy `.md` command definitions (Claude) or install executables
  under expected command directories.

- **Hook handlers:** Place executable scripts under `.cursor/hooks/`,
  `.claude/hooks/`, `.gemini/hooks/`, etc., and reference them from JSON/TOML.

- **Prompt (convention):** Copy markdown into `installed-prompts/` (or similar)
  and optionally document in `AGENTS.md`.

Operations may need **preserve mode** (never overwrite user changes) vs
**package wins** for named ATP-managed paths.

## 4. Markdown aggregation or section patch

**Intent:** Update instruction files that are **concatenated** or **layered**
across directories rather than replaced wholesale.

Examples from Feature 5:

- **Codex `AGENTS.md`:** Root-to-leaf concatenation; fallback filenames from
  `config.toml`; size cap (`project_doc_max_bytes`).

- **Claude `CLAUDE.md`:** Hierarchy and `@path` imports — ATP might **append**
  a managed block or **inject** an import line rather than replacing the file.

- **Gemini `GEMINI.md`:** Similar hierarchy and `@path` imports.

**Tactical variants:** Append ATP delimiter block; insert `@import` of a file
ATP owns; create **sidecar** file only and add one import line to the user
file.

## 5. Single-file markdown emit (no frontmatter merge)

**Intent:** Write or append **plain** markdown where the agent does not use
YAML frontmatter in that location.

Examples: `AGENTS.md` as Cursor alternative to rules; documentation snippets;
`installed-prompts/` files.

## 6. TOML document for Gemini custom commands

**Intent:** Materialise `.toml` under `.gemini/commands/` or
`~/.gemini/commands/` with required `prompt`, optional `description`, and
namespaced paths for slash command names.

This is a **generate** operation (template from package metadata) more than a
merge, though **name clash** policy (project overrides user) must match product
docs.

## 7. JSON hook graph merge (event → array of handlers)

**Intent:** For `hooks.json` (Cursor, Codex), merge new hook definitions into
the `hooks` object keyed by **event name**, appending to per-event arrays
without dropping existing handlers.

**Sub-operations:** Matcher groups, command vs prompt hook types (Cursor),
version field enforcement.

## 8. Nested JSON slice merge (`settings.json`)

**Intent:** For Claude Code and Gemini CLI, merge into the `hooks` and
`mcpServers` **properties** inside `settings.json` while preserving unrelated
top-level keys and respecting merge order across layers (project vs user).

## 9. Executable install and permission bit

**Intent:** Copy hook scripts, command binaries, or bundles; set executable
where required; record paths for uninstall.

## 10. Interpolation and env wiring (MCP and hooks)

**Intent:** After structural merge, ensure fields that support
`${env:…}`, `${workspaceFolder}`, or Codex-style env expansion are valid.
May be **validate only** or **normalise** paths for project-relative commands.

## 11. Optional discovery hints

**Intent:** Small edits to **human-facing** index files — for example append a
bullet to `AGENTS.md` pointing at `installed-prompts/` or a symlinked skills
path — without owning the whole file.

## 12. Experimental / plugin-shaped drops

**Intent:** Configurable **opaque** or **schema-light** install paths for
**Experimental** parts: copy arbitrary trees, or merge JSON/TOML fragments when
the target schema stabilises.

# Cross-cutting concerns

| Concern           | Why it matters                                        |
|-------------------|-------------------------------------------------------|
| Idempotency       | Re-install should not duplicate MCP entries or hooks |
| Identity keys     | Stable IDs for “this package owns this fragment”     |
| Layer choice      | Project vs user vs global install targets              |
| Schema drift      | Agent docs change; version gates per agent           |
| Uninstall         | Each operation should map to reversible artifacts    |

# Next steps (planning)

1. Freeze a **provider capability matrix**: which operations each
   (agent × part type) requires.

2. Define **internal DTOs** for “config patch” vs “file tree” vs “assembled
   rule” before touching serializers.

3. Prototype **merge** for one JSON target (`mcp.json`) and one nested target
   (`settings.json` `mcpServers`) to validate collision and formatting.

4. Prototype **MD+YAML → .mdc** with golden-file tests for Cursor rules.

5. Document **non-goals** (for example Team/Enterprise-only Cursor paths) until
   ATP has a story for those layers.
