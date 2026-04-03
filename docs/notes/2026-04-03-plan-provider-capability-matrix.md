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

- **Opt** — Optional or policy-driven (layer choice, user vs project).

- **Conv** — Convention only; ATP may ship a pattern (for example
  `installed-prompts/`).

- **Def** — Deferred (**TBD** in Feature 5, or **Partial** where ATP defers).

- **F5** — Feature 5 support level for that cell (**Y**, **Partial**, **TBD**).

- Operation **IDs** match sections 1–12 in the file-operations plan.

**Default install layer** is **project** unless noted. User or global layers
are **Opt** and depend on `atp install` / config policy.

# Operation ID legend

| ID | Short name            |
|----|-----------------------|
| 1  | Config merge          |
| 2  | Rule assembly         |
| 3  | Tree materialise      |
| 4  | Markdown aggregate    |
| 5  | Plain markdown emit   |
| 6  | TOML command generate |
| 7  | Hook JSON graph       |
| 8  | Settings nested merge |
| 9  | Executable install    |
| 10 | Interpolation validate |
| 11 | Discovery hint        |
| 12 | Experimental drop     |

### Summaries (IDs 1–6)

(1) Create or amend JSON or TOML registry files.

(2) Markdown + YAML → `.mdc` / `.md` with frontmatter.

(3) Copy or sync directory trees (skills, scripts, assets).

(4) Patch, append, or import for layered instruction files.

(5) Write `.md` body only (no YAML assembly step).

(6) Gemini-style `.toml` custom commands.

### Summaries (IDs 7–12)

(7) Merge `hooks.json` event → handler arrays.

(8) Merge `hooks` / `mcpServers` inside `settings.json`.

(9) Install scripts or binaries and set execute bit.

(10) Normalise or validate env/path placeholders in config.

(11) Small pointer edits in `AGENTS.md` or similar.

(12) Configurable opaque or schema-light install.

# Cursor

| Part         | F5      | Req     | Opt   |
|--------------|---------|---------|-------|
| Rule         | Y       | 2, 3    | 5, 11 |
| Prompt       | Partial | —       | 3, 11 |
| Skill        | Y       | 3       | —     |
| Hook         | Y       | 7, 3, 9 | 1, 10 |
| Mcp          | Y       | 1, 10   | —     |
| Command      | Partial | 3       | 11    |
| Experimental | TBD     | —       | 12    |

### Notes — Cursor

- **Rule:** `.md` or `.mdc` under `.cursor/rules/`; `AGENTS.md` uses **5** or **4**.

- **Prompt:** Convention: `installed-prompts/`. MCP Prompts live on servers,
  not op **1**.

- **Skill:** `.cursor/skills/` plus compat paths from Feature 5.

- **Hook:** Project `.cursor/hooks.json`. Enterprise/team layers **Def** for
  now.

- **Mcp:** `.cursor/mcp.json` at project; global path **Opt**.

- **Command:** Prefer skill materialisation; slash UX is not an on-disk format.

- **Experimental:** **Def** until Cursor documents a stable surface.

# Claude Code

| Part         | F5      | Req     | Opt   |
|--------------|---------|---------|-------|
| Rule         | Y       | 2, 3    | 4, 5  |
| Prompt       | Partial | —       | 11    |
| Skill        | Y       | 3       | —     |
| Hook         | Y       | 8, 3, 9 | 1, 10 |
| Mcp          | Y       | 1, 10   | —     |
| Command      | Y       | 3       | —     |
| Experimental | TBD     | —       | 12    |

### Notes — Claude Code

- **Rule:** `.claude/rules/`; `CLAUDE.md` stacks use **4** or **5**.

- **Prompt:** Convention only; MCP and `@` are out of band.

- **Skill:** `.claude/skills/<name>/`.

- **Hook:** `hooks` in `settings.json`; scripts under `.claude/hooks/`.

- **Mcp:** `.mcp.json` and `~/.claude.json`; second path **Opt** by layer.

- **Command:** `.claude/commands/<name>.md`.

- **Experimental:** Teams/plugins **Def** until scoped.

# Gemini CLI

| Part         | F5      | Req     | Opt |
|--------------|---------|---------|-----|
| Rule         | Y       | 2, 3, 4 | 5   |
| Prompt       | Partial | 6       | 11  |
| Skill        | Y       | 3       | —   |
| Hook         | Y       | 8, 3, 9 | 10  |
| Mcp          | Y       | 8, 10   | —   |
| Command      | Y       | 6       | —   |
| Experimental | TBD     | —       | 12  |

### Notes — Gemini CLI

- **Rule:** `GEMINI.md` hierarchy and `@path`; extra names via `settings.json`
  **Opt**.

- **Prompt:** On-disk prompts via custom commands (**6**); chat/MCP otherwise.

- **Skill:** `.gemini/skills/` or `.agents/skills/`.

- **Hook:** `hooks` in merged `settings.json`.

- **Mcp:** `mcpServers` and optional `mcp` allow/deny in the same file.

- **Command:** `.gemini/commands/*.toml`.

- **Experimental:** Subagents/plan mode **Def**.

# Codex CLI

| Part         | F5      | Req     | Opt   |
|--------------|---------|---------|-------|
| Rule         | Y       | 3, 4, 5 | 11    |
| Prompt       | Partial | —       | 11    |
| Skill        | Y       | 3       | —     |
| Hook         | Partial | 7, 3, 9 | 1, 10 |
| Mcp          | Y       | 1, 10   | —     |
| Command      | Partial | 3       | 11    |
| Experimental | TBD     | —       | 12    |

### Notes — Codex CLI

- **Rule:** `AGENTS.md` discovery, size caps, `config.toml` fallbacks.

- **Prompt:** Session, `@`, MCP; optional prompts dir **Opt**.

- **Skill:** `.agents/skills/`; include `agents/openai.yaml` when present.

- **Hook:** **7**, **3**, **9** when hooks enabled; **1** for `codex_hooks`
  **Opt**.

- **Mcp:** `[mcp_servers.*]` in `config.toml`.

- **Command:** No user slash file format; skills carry workflows.

- **Experimental:** Hooks/subagents maturity **Def**.

# Consolidated view (required operations only)

IDs that must exist for a **complete** provider set (**Def** rows excluded).

| ID | Detail ref |
|----|------------|
| 1  | (C1)       |
| 2  | (C2)       |
| 3  | (C3)       |
| 4  | (C4)       |
| 5  | (C5)       |
| 6  | (C6)       |
| 7  | (C7)       |
| 8  | (C8)       |
| 9  | (C9)       |
| 10 | (C10)      |
| 11 | (C11)      |
| 12 | (C12)      |

(C1) **cursor:Mcp**, **claude:Mcp**, **codex:Mcp**; **codex:Hook** as **Opt**
(`codex_hooks`).

(C2) **cursor:Rule**, **claude:Rule**, **gemini:Rule**.

(C3) All agents for **Rule**, **Skill**, **Hook**, **Command** where F5 is **Y**
or **Partial** (per matrix).

(C4) **gemini:Rule**, **codex:Rule**; **claude:Rule** and **cursor:Rule**
(**Opt**, via `AGENTS.md`).

(C5) **codex:Rule**; **cursor:Rule** and **claude:Rule** as **Opt**.

(C6) **gemini:Prompt** (convention) and **gemini:Command**.

(C7) **cursor:Hook**, **codex:Hook**.

(C8) **claude:Hook**, **claude:Mcp**; **gemini:Hook**, **gemini:Mcp**.

(C9) **cursor**, **claude**, **gemini**, **codex** **Hook** rows.

(C10) All **Mcp** rows; **Hook** rows where command paths use expansion.

(C11) **Partial** **Prompt** / **Command**; optional **Rule** ergonomics.

(C12) **Experimental** rows (**Def** until specified).

# Open decisions (to lock in implementation)

NOTE: The answers for these questions are below. The Operation ID numbers in these questions make
it hard to read these questions.

1. **Layer policy:** Which project vs user vs global combinations does ATP v1
   support (Feature 5 lists many layers)?

2. **Single vs multi provider:** One module per agent vs part-strategy objects
   composed per agent?

3. **Codex hooks:** Is op **1** (**Req** when installing Hook parts) or
   document-only until hooks leave experimental?

4. **Cursor Rule:** Default **2** → `.mdc` vs **5** → `.md` when the package is
   markdown-only?

5. **Idempotency key:** One namespace per (agent, layer, path, logical entry)
   shared across **1**, **7**, **8**?

## Answering open decisions

1. Layer Policy is too simple a question

There are really only two layers of installation, because packages are either installed
into a project Safehouse or the user's Station. In general, installing the project's
Safehouse is the scope that needs focus because it makes sense that this would be used
most often in the early stages of ATP's development as it represents the least-risk choice.

Layers versus capability. There is another aspect, the file level operations we are
now defining are about capability. The capability to install a package by unpacking and
copying the files into the correct directory; the capability to create or amend a JSON or TOML
file to configure a new MCP server or hook; regardless of any layering, capabilities must be
developed and proven to work reliably, every single time.

2. Single versus multi provider.

A package will be installed to a project Safehouse that is configured for a given agent. One agent only.
Or the package will be installed to a user's Station and this should have nominated a given agent.
Station association with a particular agent is less defined right now, and because of the earlier
point that installing to project Safehouses is more important at this moment in time, it's not
a big issue but will be solved in a later version of ATP.

Therefore installation is a single-provider consideration because there will only be one
agent at-a-time. Now it is possible that the user may switch agents after the package were installed
and a conversion process will need to be undertaken - the simplest of which is to uninstall the package
and reinstall it for the new agent.

3. Codex hooks is op 1 - meaning config merge

Codex hooks need to have hooks enabled in the feature flag config TOML file and also in a hooks.json file.
See [Codex Hooks](https://developers.openai.com/codex/hooks) for details.

Codex development is moving quickly and we should treat hooks as being a supported feature because
if they aren't right now, they probably will be very soon. Therefore, do not treat as experimental.
We should WARN the user if the feature flag in `config.toml` has hooks disabled, and ask if they
want it enabled prior to changes and installation, because that may break things. 
THE USER MUST BE IN CONTROL OF THEIR SYSTEM.

4. Cursor rules - .mdc or .md filename when the package is markdown-only?

Markdown-only tells me the YAML front-matter is missing. We should allow the provider to support
and extend the package validation process, so the user gets more specific and causal information about
why a particular file is needed or a change is needed to their package.

For widest compatibility reasons, we should REQUIRE the package validation rules check for YAML frontmatter
YAML files being one of the part components such that foo.md rule markdown is accompanied by foo.yaml that
supplies the YAML frontmatter.

Cursor will treat and process .md and .mdc files equivalently, so the filename is much less important
than the YAML frontmatter being omitted for agents that need it. Missing frontmatter will mean the
rule is not used.

5. Idempotency key: one namespace per agent, layer, path or logical entry

This is a realiability issue and the capability to update configuration safely is CRITICAL.
If an MCP server has been registered in a settings file (mcp.json, settings.json etc) then
it should not be added again. This requires being able to prove the configuration is uniquely
associated with the MCP server being installed at that moment - or any other part that requires
registration updates (hook etc). If ATP cannot confirm that the configuration is already in place
and, therefore is uncertain whether to proceed with patching the configuration file, it should ask the user
to make a decision which requires ATP to explain the ambiguous situation and for the user to give an override switch to force the installation of the package. The CLI switch should be called `--force-config` to make
ATP perform the configuration update and `--skip-config` to skip the process. THIS KEEPS THE USER IN CONTROL.

The assumption is that the installation path that installing the package targets will either collide
with existing configuration or not. This will be on a per-agent basis because the configuration file
typically exists only in the agent's project or user directory.

This logic should exist in the agent provider because only the provider knows the needs of the agent
that is configured for the project's safehouse, and later for the user's station.

# Next step (step 3)

Prototype **merge** for `mcp.json` and `settings.json` `mcpServers` (see
file-operations plan step 3). Step 2 (**internal DTOs**) is recorded in
[2026-04-03-plan-provider-internal-dtos](./2026-04-03-plan-provider-internal-dtos.md).
