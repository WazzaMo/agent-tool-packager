# Plan: Provider capability matrix (step 1)

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

This note **freezes step 1** from
[2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md):
for each **agent × part type**, which **file-level operations** (by ID from that
note) a provider must support. Source product mapping:
[Feature 5 — Installer providers for known agents](../features/5-installer-providers-for-known-agents.md).

# How to read the matrix

- **Req** — Required for ATP “full” support of that cell in Feature 5 (**Y**).

- **Opt** — Optional or policy-driven (ordering, layer choice, user vs project).

- **Conv** — **Convention only** (no official on-disk type); ATP may ship a
  pattern (for example `installed-prompts/`).

- **Def** — Deferred (**TBD** in Feature 5, or **Partial** where ATP defers to
  a later epic).

- Operation **IDs** match the numbered sections in the file-operations plan
  (1–12).

**Default install layer** in the tables below is **project** unless noted.
Global or user layers are **Opt** and depend on `atp install` / config policy.

# Operation ID legend

| ID | Short name              | Summary                                      |
|----|-------------------------|----------------------------------------------|
| 1  | Config merge            | Create/amend JSON or TOML registry files       |
| 2  | Rule assembly           | Markdown + YAML → `.mdc` / `.md` + frontmatter |
| 3  | Tree materialise        | Copy/sync directory trees (skills, scripts)  |
| 4  | Markdown aggregate      | Patch/append/import for layered instruction files |
| 5  | Plain markdown emit     | Write `.md` body only (no YAML assembly)     |
| 6  | TOML command generate   | Gemini-style `.toml` custom commands         |
| 7  | Hook JSON graph         | Merge `hooks.json` event → handler arrays    |
| 8  | Settings nested merge   | Merge `hooks` / `mcpServers` in `settings.json` |
| 9  | Executable install      | Scripts/binaries + execute bit               |
| 10 | Interpolation validate    | Normalise/validate env/path placeholders     |
| 11 | Discovery hint          | Small `AGENTS.md` (or similar) pointer edits   |
| 12 | Experimental drop       | Configurable opaque or schema-light install  |

# Cursor

| Part         | Feature 5 | Ops (Req)  | Ops (Opt) | Notes             |
|--------------|-----------|------------|-----------|-------------------|
| Rule         | Y         | 2, 3       | 5, 11     | `.md`/`.mdc` in `.cursor/rules/`; `AGENTS.md` is 5 or 4 |
| Prompt       | Partial   | —          | 3, 11     | Conv: `installed-prompts/`; MCP Prompts are server-side, not 1 |
| Skill        | Y         | 3          | —         | `.cursor/skills/` (and compat paths per Feature 5) |
| Hook         | Y         | 7, 3, 9    | 1, 10     | Project `.cursor/hooks.json`; enterprise/team **Def** |
| Mcp          | Y         | 1, 10      | —         | `.cursor/mcp.json` (project); global path **Opt** |
| Command      | Partial   | 3          | 11        | Prefer skill materialisation; slash UX not a file format |
| Experimental | TBD       | —          | 12        | Until Cursor documents a stable surface |

Ops = operations


# Claude Code

| Part         | Feature 5 | Operations (Req) | Operations (Opt) | Notes |
|--------------|-----------|------------------|------------------|-------|
| Rule         | Y         | 2, 3             | 4, 5             | `.claude/rules/`; `CLAUDE.md` layers use 4 or 5 |
| Prompt       | Partial   | —                | 11               | Conv only; MCP/`@` out of band |
| Skill        | Y         | 3                | —                | `.claude/skills/<name>/` |
| Hook         | Y         | 8, 3, 9          | 1, 10            | `hooks` inside `settings.json`; scripts under `.claude/hooks/` |
| Mcp          | Y         | 1, 10            | —                | `.mcp.json`, `~/.claude.json` — second path **Opt** by layer |
| Command      | Y         | 3                | —                | `.claude/commands/<name>.md` |
| Experimental | TBD       | —                | 12               | Teams/plugins: **Def** until ATP scopes |

# Gemini CLI

| Part         | Feature 5 | Operations (Req) | Operations (Opt) | Notes |
|--------------|-----------|------------------|------------------|-------|
| Rule         | Y         | 2, 3, 4          | 5                | `GEMINI.md` hierarchy, `@path`; `settings.json` names **Opt** |
| Prompt       | Partial   | 6                | 11               | Custom commands as on-disk prompts; chat/MCP otherwise |
| Skill        | Y         | 3                | —                | `.gemini/skills/` or `.agents/skills/` |
| Hook         | Y         | 8, 3, 9          | 10               | `hooks` in merged `settings.json` |
| Mcp          | Y         | 8, 10            | —                | `mcpServers` + optional `mcp` allow/deny in same file |
| Command      | Y         | 6                | —                | `.gemini/commands/*.toml` |
| Experimental | TBD       | —                | 12               | Subagents/plan mode: **Def** |

# Codex CLI

| Part         | Feature 5 | Operations (Req) | Operations (Opt) | Notes |
|--------------|-----------|------------------|------------------|-------|
| Rule         | Y         | 3, 4, 5          | 11               | `AGENTS.md` discovery, caps, fallbacks in `config.toml` |
| Prompt       | Partial   | —                | 11               | Session/`@`/MCP; conv prompts dir **Opt** |
| Skill        | Y         | 3                | —                | `.agents/skills/` (+ `agents/openai.yaml` when present) |
| Hook         | Partial   | 7, 3, 9          | 1, 10            | **Req** `hooks.json` when hooks enabled; **Opt** 1 for `[features] codex_hooks` |
| Mcp          | Y         | 1, 10            | —                | `[mcp_servers.*]` in `config.toml` |
| Command      | Partial   | 3                | 11               | No user slash file format; skills carry workflows |
| Experimental | TBD       | —                | 12               | Hooks/subagents maturity: **Def** |

# Consolidated view (required operations only)

Which IDs must exist in code for a **complete** provider set (ignoring **Def**
rows):

| ID | Used by (agent:parts) |
|----|------------------------|
| 1  | cursor:Mcp; claude:Mcp; codex:Mcp; codex:Hook (opt) |
| 2  | cursor:Rule; claude:Rule; gemini:Rule |
| 3  | All agents × Rule/Skill/Hook/Command (where Y or Partial) |
| 4  | gemini:Rule; codex:Rule; claude:Rule (opt); cursor:Rule via AGENTS (opt) |
| 5  | cursor:Rule (opt); claude:Rule (opt); codex:Rule |
| 6  | gemini:Prompt (conv); gemini:Command |
| 7  | cursor:Hook; codex:Hook |
| 8  | claude:Hook, claude:Mcp; gemini:Hook, gemini:Mcp |
| 9  | cursor:Hook; claude:Hook; gemini:Hook; codex:Hook |
| 10 | All Mcp rows; Hook rows where command paths use expansion |
| 11 | Partial Prompt/Command; optional Rule ergonomics |
| 12 | Experimental rows (**Def** until specified) |

# Open decisions (to lock in implementation)

1. **Layer policy:** For each agent, which combinations of project vs user vs
   global does ATP support in v1 (Feature 5 lists many layers)?

2. **Single vs multi provider:** One module per agent implementing all parts, or
   part-strategy objects composed per agent?

3. **Codex hooks:** Treat **1** (toggle `codex_hooks`) as **Req** when installing
   Hook parts, or document-only until hooks leave experimental?

4. **Cursor Rule:** Default artefact **2 → `.mdc`** vs **5 → `.md`** when the
   package supplies only markdown.

5. **Idempotency key:** One key namespace per (agent, layer, file path, logical
   entry) shared across operations **1**, **7**, **8**.

# Next step (step 2)

Proceed to **internal DTOs** (file-operations plan step 2) using this matrix as
the contract: each cell’s Req/Opt set maps to a ordered list of **provider
actions** emitted from the install pipeline.
