# Installer Providers for Known Agents

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

# Overview

ATP needs **installer provider** logic for every package part type. A provider
finishes installation by creating or updating the right files for each agent:
for example `mcp.json`, `hooks.json`, JSON hook configs beside Codex config
layers, or (for Claude Code and Gemini CLI) hook and `mcpServers` entries in
`settings.json`, or (for Codex CLI) `[mcp_servers.*]` in `config.toml` and
entries in `hooks.json` when hooks are enabled.

Some parts only need markdown copied into the correct directory; others need
structured config merges or new files. This feature maps **agents**, **part
types**, and **on-disk or settings targets** so implementers know what to build.

# Package part types

## Canonical definitions

Definitions match
[Feature 2 — Package developer support](./2-package-developer-support.md#explore-the-workflow-for-package-devs).

1. **Rule** — Prompt material (usually markdown) under the agent rules area
   (for example Cursor `rules/`).

2. **Prompt** — Reusable prompt templates or instruction files (usually
   markdown) under the agent prompts area (for example Cursor `prompts/`).

3. **Skill** — Markdown (and supporting files) that describe how the agent
   should achieve an outcome or goal.

4. **Hook** — Hook configuration and scripts (for example `hooks.json` plus
   executables under `hooks/`). Cursor, Claude Code, and Kiro (and related
   agents) extend the agent loop with hooks; see
   [Cursor Hooks](https://cursor.com/docs/hooks) for the layout ATP aligns with
   for Cursor installs.

5. **Mcp** — MCP servers; implementation varies by agent.

6. **Command** — Shell scripts or other executables that automate workflows.

7. **Experimental** — Payloads for extension points the ecosystem has not
   settled yet.

### Prompt type note

In many projects, **Prompt** can be implemented as a standard in-project
directory such as `installed-prompts/` where markdown files are copied. Those
files act as installed context the agent may consume. Optionally, add a hint
in `AGENTS.md` pointing readers at `installed-prompts/`.

### Experimental type note

**Experimental** is a special case: it needs more configurable install
instructions and is meant for brand-new extension surfaces a given agent may
ship. The field moves quickly, so **Experimental** acts as an explicit
“other” escape hatch.

# Agent support matrix

## How to read this table

Each row reflects that product’s official docs.

- **`claude`** — **Claude Code** (terminal / IDE). Hub:
  [Extend Claude Code](https://code.claude.com/docs/en/features-overview).

- **`gemini`** — **Gemini CLI**. Hub:
  [Gemini CLI documentation](https://geminicli.com/docs/).

- **`codex`** — **Codex CLI**. Hub:
  [Codex CLI](https://developers.openai.com/codex/cli) on OpenAI Developers.

Path conventions:

- **Cursor** — `.cursor/` or `~/.cursor/`.

- **Claude Code** — `.claude/`, project-root files such as `CLAUDE.md` and
  `.mcp.json`, and `~/.claude/`.

- **Gemini CLI** — `.gemini/` and `~/.gemini/` (including `settings.json` for
  hooks and MCP).

- **Codex CLI** — `~/.codex/` and project `.codex/` (including `config.toml`
  for MCP and defaults, and optional `hooks.json` when hooks are enabled).

Per-type references follow under **Cursor**, **Claude Code**, **Gemini CLI**,
and **Codex CLI** below.

## Matrix

| Agent  | Type         | Support | JSON? | Where (summary)                 |
|--------|--------------|---------|-------|---------------------------------|
| cursor | Rule         | Y       | N     | `.cursor/rules/`, AGENTS.md     |
| cursor | Prompt       | Partial | N     | (1)                             |
| cursor | Skill        | Y       | N     | `.cursor/skills/` etc.          |
| cursor | Hook         | Y       | Y     | `hooks.json` + scripts          |
| cursor | Mcp          | Y       | Y     | `mcp.json`                      |
| cursor | Command      | Partial | N     | (2)                             |
| cursor | Experimental | TBD     | —     | —                               |
| claude | Rule         | Y       | N     | `CLAUDE.md`, `.claude/rules/`   |
| claude | Prompt       | Partial | N     | (1)                             |
| claude | Skill        | Y       | N     | `.claude/skills/` etc.          |
| claude | Hook         | Y       | Y     | `hooks` in `settings.json`      |
| claude | Mcp          | Y       | Y     | `.mcp.json`, `~/.claude.json`   |
| claude | Command      | Y       | N     | `.claude/commands/`             |
| claude | Experimental | TBD     | —     | —                               |
| gemini | Rule         | Y       | N     | `GEMINI.md`, `~/.gemini/`       |
| gemini | Prompt       | Partial | N     | (1)                             |
| gemini | Skill        | Y       | N     | `.gemini/skills/` etc.          |
| gemini | Hook         | Y       | Y     | `hooks` in `settings.json`      |
| gemini | Mcp          | Y       | Y     | `mcpServers` in `settings.json` |
| gemini | Command      | Y       | N     | `.gemini/commands/*.toml`       |
| gemini | Experimental | TBD     | —     | —                               |
| codex  | Rule         | Y       | N     | `AGENTS.md`, `~/.codex/`        |
| codex  | Prompt       | Partial | N     | (1)                             |
| codex  | Skill        | Y       | N     | `.agents/skills/` etc.          |
| codex  | Hook         | Partial | Y     | (3)                             |
| codex  | Mcp          | Y       | Y     | `config.toml` MCP tables        |
| codex  | Command      | Partial | N     | (4)                             |
| codex  | Experimental | TBD     | —     | —                               |

## Matrix notes

(1) **Partial (Prompt):** No first-class on-disk Prompt install like rules or
skills; chat UX and MCP are the documented touchpoints.

- Cursor: MCP Prompts and `/migrate-to-skills`.

- Claude Code: MCP resources via `@`.

- Gemini CLI:
  [Custom commands](https://geminicli.com/docs/cli/custom-commands) (TOML
  prompts) and MCP resources via `@`.

- Codex CLI:
  [Prompting Codex](https://developers.openai.com/codex/prompting) and
  [Agent Skills](https://developers.openai.com/codex/skills).

(2) **Partial (Cursor Command):** Slash commands map to skills; see Command
under Cursor below.

(3) **Partial (Codex Hook):**
  [Hooks](https://developers.openai.com/codex/hooks) are experimental and
  gated by `codex_hooks`; `hooks.json` when enabled.

(4) **Partial (Codex Command):** Built-in `/` commands; skills carry
repeatable workflows.

**Support column:** **Y** means supported for provider work; **Partial** means
limited or indirect; **TBD** means not yet defined for ATP.

# Software Design Strategy

Strategy is a response to challenges and the challenges here are that there
are a number of similar operations that need to be performed in different
ways for different agents. This requires a distribution of know-how and
software capability at different levels, to allow for software re-use,
simplicity in solution, where the world is complex, and small, simple building
blocks that can be very well specified and tested.

## Thinking bottom-up

### The Low-level operations

These operations are nearest the bottom of the tech stack.

There are a number of similar file operations:
- locate a given configuration file of type JSON
- locate a given configuration file of type TOML
- Common operations for both configuration formats:
  - create the file if it is definitely missing
  - have techniques to be sure that the file is missing
  - if unsure, have ways to ask the user to 

Markdown with YAML frontmatter
- rules as defined by Cursor
- skills standard, defined by Anthropic

Directory location operations:
- confirming the project directory from the Safehouse location
- finding the agent configuration directory within a project directory.
- finding the configuration files for an agent in the project/agent directory

These operations represent the low-level functions that all agent providers need
in order to configure and install packages correctly so that the facilities they
provide will be discovered and used by the agent.

### The Agent Providers

#### Agent Provider Interface

Agent providers are a concept and a protocol that call on installation services.
The agent provider implementation knows the specifics of dealing with that agent.
The agent provider interface, defines a common protocol for ATP's CLI tool to 
call on provider services during inspection and installation of packages.

The exported interface should be called `AgentProvider` as the generic definition
of representing the CLI-provider contract.

#### Agent Provider Implementations

Each agent has different locations and configurations needs. These needs must be known
somewhere in ATP's software and the Agent Provider instance is that place.

The `CursorAgentProvider` implements the `AgentProvider` interface with concrete implementations
of the services promised by the `AgentProvider` contract that use the low-level operations
based on what it knows about the Cursor Agent.

There should be classes for each agent:

- CursorAgentProvider for Cursor
- ClaudeAgentProvider for Claude
- CodexAgentProvider for Codex
- GeminiAgentProvider for Gemini CLI.

This allows each implemenation of the `AgentProvider` to be tested through unit ant integration tests.
It also allows one of the providers to be extended and maintained as the Agent it supports changes or adopts
new features, without impacting any other agent provider because each class is completely separate.

#### Dependency Injection in ATP CLI

The ATP CLI can use its Safehouse configuration, at the project level, to know which agent provider
to instantiate and use for performing installation, removal and any inspection work.


# Cursor

Reference (hub): [Cursor documentation](https://cursor.com/docs).

## Rule

Reference: [Rules](https://cursor.com/docs/context/rules).

- **Project rules:** Markdown in `.cursor/rules/` (`.md` or `.mdc` with
  frontmatter: `description`, `globs`, `alwaysApply`). Application modes include
  always, intelligent, glob-scoped, and manual `@` mention.

- **AGENTS.md:** Plain markdown at repo root (and nested paths) as a simpler
  alternative to `.cursor/rules/`.

- **User rules:** Cursor Settings → Rules, Agent (Chat) only (not Inline Edit).

- **Team rules:** Dashboard on Team/Enterprise plans; precedence Team → Project
  → User.

## Prompt

Reference:
[Prompting agents](https://cursor.com/docs/agent/prompting) (chat UX);
[MCP](https://cursor.com/docs/mcp) (MCP Prompts on servers).

- **Agent chat:** Prompting covers `@` context, images, voice, and models—not a
  separate on-disk prompts package format.

- **MCP:** MCP documents **Prompts** as a server capability (templated
  messages/workflows), alongside Tools, Resources, etc.

## Skill

Reference: [Agent Skills](https://cursor.com/docs/skills).

- **Layout:** Each skill is a directory with `SKILL.md` (YAML frontmatter:
  required `name`, `description`; optional `license`, `compatibility`,
  `metadata`, `disable-model-invocation`). Optional `scripts/`,
  `references/`, `assets/`.

- **Discovery:** `.agents/skills/`, `.cursor/skills/`, `~/.cursor/skills/`,
  plus `.claude/skills/`, `.codex/skills/`, and global variants for
  compatibility.

## Hook

Reference: [Hooks](https://cursor.com/docs/hooks).

- **Config:** `hooks.json` with `"version": 1` and a `hooks` object mapping
  event names to arrays of hook definitions.

- **Locations (priority high → low):** Enterprise (OS-specific paths), team
  (cloud), project `.cursor/hooks.json`, user `~/.cursor/hooks.json`. Project
  hooks run from repo root; user hooks from `~/.cursor/`.

- **Types:** Default **command** hooks (stdin/stdout JSON); optional **prompt**
  hooks (`type: "prompt"`) evaluated by a fast model. Agent vs Tab use
  different event sets.

## Mcp

Reference: [MCP](https://cursor.com/docs/mcp).

- **Config file:** JSON with `mcpServers` entries. **Project:**
  `.cursor/mcp.json`. **Global:** `~/.cursor/mcp.json`.

- **Transports:** stdio (`type`, `command`, `args`, `env`, `envFile`), remote
  `url` with optional `headers` and static OAuth `auth`. Variable interpolation
  in selected fields (`${env:…}`, `${workspaceFolder}`, etc.).

## Command

Reference:
[Slash commands](https://cursor.com/docs/cli/reference/slash-commands);
[Agent Skills](https://cursor.com/docs/skills) (slash-command migration).

- **CLI:** Slash commands such as `/commands` (create or edit commands) are
  listed in the slash-commands reference.

- **Skills overlap:** `/migrate-to-skills` (Cursor 2.4+) converts eligible slash
  commands into skills under `.cursor/skills/` with explicit invocation.

## Experimental

Reference: [Cursor documentation](https://cursor.com/docs) (no page specific to
this ATP type yet).

TBD: provider mapping when Cursor documents a stable install surface.

# Claude Code

Reference (hub):
[Extend Claude Code](https://code.claude.com/docs/en/features-overview)
(feature map: CLAUDE.md, Skills, MCP, Subagents, Hooks, Plugins).

Companion guides:
[How Claude remembers your project](https://code.claude.com/docs/en/memory),
[Skills](https://code.claude.com/docs/en/skills),
[Hooks reference](https://code.claude.com/docs/en/hooks),
[MCP](https://code.claude.com/docs/en/mcp).

## Rule

Reference:
[How Claude remembers your project](https://code.claude.com/docs/en/memory);
[Extend Claude Code](https://code.claude.com/docs/en/features-overview)
(CLAUDE.md vs rules vs skills).

- **CLAUDE.md:** Project instructions at `./CLAUDE.md` or `./.claude/CLAUDE.md`,
  plus user `~/.claude/CLAUDE.md` and managed policy paths. Content loads every
  session; hierarchy walks ancestors and lazy-loads nested `CLAUDE.md` files.
  Imports use `@path` syntax.

- **`.claude/rules/`:** Markdown rules (recursive `.md`), optionally path-scoped
  with YAML `paths` frontmatter. User rules in `~/.claude/rules/` apply before
  project rules.

- **AGENTS.md:** Not read natively; the memory guide recommends importing it
  from `CLAUDE.md` so Claude Code and other agents share one file.

## Prompt

Reference:
[Extend Claude Code](https://code.claude.com/docs/en/features-overview)
(on-demand skills vs always-on memory);
[MCP](https://code.claude.com/docs/en/mcp) (protocol capabilities).

- **Chat:** Natural-language prompts and context are session input, not a
  separate packaged prompts directory in the extension model.

- **MCP:** Servers can expose tools, prompts, resources, and (with
  notifications) updated capabilities; resources are attachable via `@`
  mentions per the MCP guide.

## Skill

Reference:
[Skills](https://code.claude.com/docs/en/skills);
[Extend Claude Code](https://code.claude.com/docs/en/features-overview).

- **Standard:** Skills follow the [Agent Skills](https://agentskills.io/) open
  standard with Claude Code extensions (invocation control, `context: fork`,
  dynamic injection, optional `hooks` in frontmatter).

- **Locations:** Enterprise (managed), `~/.claude/skills/<name>/SKILL.md`,
  `.claude/skills/<name>/SKILL.md`, plugins under `skills/`, and nested package
  `.claude/skills/` in monorepos. Name collisions resolve managed > personal >
  project; plugin skills are namespaced.

## Hook

Reference:
[Hooks reference](https://code.claude.com/docs/en/hooks);
[Automate workflows with hooks](https://code.claude.com/en/hooks-guide);
[Extend Claude Code](https://code.claude.com/docs/en/features-overview).

- **Configuration:** Hooks live under a `hooks` object in JSON settings, not a
  standalone `hooks.json`: `~/.claude/settings.json` (user),
  `.claude/settings.json` (project), `.claude/settings.local.json` (local),
  managed policy, plugin `hooks/hooks.json`, or skill/agent frontmatter for
  scoped lifecycle hooks.

- **Handlers:** `command`, `http`, `prompt`, and `agent` handler types; matcher
  groups filter events such as `PreToolUse`, `PostToolUse`, `SessionStart`,
  `InstructionsLoaded`, etc. Scripts often live under `.claude/hooks/` and are
  referenced with `$CLAUDE_PROJECT_DIR`.

- **Merge:** All matching hooks from every source run; see the features
  overview layering table (hooks merge).

## Mcp

Reference:
[MCP](https://code.claude.com/docs/en/mcp);
[Extend Claude Code](https://code.claude.com/docs/en/features-overview).

- **CLI:** `claude mcp add` with transports stdio, HTTP (preferred for remote),
  or SSE (deprecated where HTTP exists); scopes `local`, `project`
  (`.mcp.json` at repo root, `mcpServers`), and `user` (`~/.claude.json`).
  Precedence: local > project > user when names collide.

- **Extras:** OAuth, `headersHelper`, env expansion in `.mcp.json`, plugins
  bundling `.mcp.json`, optional Claude.ai connectors, and `/mcp` for status
  and auth.

## Command

Reference:
[Skills](https://code.claude.com/docs/en/skills) (custom commands merged into
skills);
[built-in commands](https://code.claude.com/en/commands).

- **Custom commands:** A markdown file at `.claude/commands/<name>.md` defines
  the same `/name` slash entry as `.claude/skills/<name>/SKILL.md`; skills are
  the superset (frontmatter, supporting files). If both exist for one name,
  the skill wins.

- **Built-in:** Fixed-logic slash commands (for example `/compact`, `/init`)
  are documented separately from user skills.

## Experimental

Reference:
[Extend Claude Code](https://code.claude.com/docs/en/features-overview)
(agent teams marked experimental; plugins and marketplaces as packaging).

TBD: which experimental surfaces get stable ATP install paths (for example
agent teams, channel-only workflows).

# Gemini CLI

Reference (hub): [Gemini CLI documentation](https://geminicli.com/docs/).

Feature index:
[Agent Skills](https://geminicli.com/docs/cli/skills),
[Hooks](https://geminicli.com/docs/hooks),
[MCP servers](https://geminicli.com/docs/tools/mcp-server),
[Custom commands](https://geminicli.com/docs/cli/custom-commands),
[Extensions](https://geminicli.com/docs/extensions).

## Rule

Reference:
[Project context (GEMINI.md)](https://geminicli.com/docs/cli/gemini-md);
[Memory import processor](https://geminicli.com/docs/reference/memport).

- **Hierarchy:** Global `~/.gemini/GEMINI.md`, workspace `GEMINI.md` files
  (parents of configured workspaces), and just-in-time files when tools touch
  paths (ancestors up to a trusted root). Contents concatenate into context for
  prompts.

- **Imports:** `@path` syntax pulls other markdown files; see the memport
  reference for processing rules.

- **Alternate names:** `context.fileName` in `settings.json` can list
  filenames such as `AGENTS.md` alongside `GEMINI.md`.

- **Commands:** `/memory show`, `/memory reload`, `/memory add` for inspection
  and global append.

## Prompt

Reference:
[Custom commands](https://geminicli.com/docs/cli/custom-commands);
[MCP servers](https://geminicli.com/docs/tools/mcp-server) (tools, resources,
prompts).

- **Chat:** Session prompts and context are primary input; there is no separate
  vendor-defined prompts directory beyond context files and commands.

- **Custom commands:** Reusable prompts live as `.toml` files under
  `~/.gemini/commands/` and `.gemini/commands/` (project overrides user on
  name clash), with optional `{{args}}`, `!{...}` shell injection, and
  `@{...}` file injection.

- **MCP:** `/mcp` lists tools and prompts; resource URIs can be attached with
  `@server://resource/path` syntax per the MCP guide.

## Skill

Reference:
[Agent Skills](https://geminicli.com/docs/cli/skills);
[Create Agent Skills](https://geminicli.com/docs/cli/creating-skills);
[Extensions](https://geminicli.com/docs/extensions).

- **Standard:** Based on [Agent Skills](https://agentskills.io/); discovery
  injects name and description into the system prompt; activation uses the
  `activate_skill` tool with user consent, then loads `SKILL.md` and grants the
  skill directory on the allow path.

- **Tiers:** Workspace `.gemini/skills/` or `.agents/skills/` (within tier,
  `.agents/skills/` wins over `.gemini/skills/`), user `~/.gemini/skills/` or
  `~/.agents/skills/`, and extension-bundled skills. Precedence: workspace >
  user > extension.

- **Management:** `/skills` and `gemini skills` for list, link, install,
  enable, and disable.

## Hook

Reference:
[Gemini CLI hooks](https://geminicli.com/docs/hooks);
[Hooks reference](https://geminicli.com/docs/hooks/reference);
[Writing hooks](https://geminicli.com/docs/hooks/writing-hooks).

- **Configuration:** `hooks` object in merged `settings.json` (project
  `.gemini/settings.json`, user `~/.gemini/settings.json`, system
  `/etc/gemini-cli/settings.json`, plus extensions). Not a standalone
  `hooks.json`.

- **Handlers:** Currently `type: "command"` with `command`, optional `matcher`,
  `timeout` (ms), `name`. JSON on stdin/stdout; exit `0` with JSON decisions,
  `2` for a hard block, other codes as warnings.

- **Scripts:** Often under `.gemini/hooks/`; `$GEMINI_PROJECT_DIR` (and
  `CLAUDE_PROJECT_DIR` alias) identifies the project root.

- **UI:** `/hooks panel`, `/hooks enable|disable`, `/hooks enable-all|disable-all`.

## Mcp

Reference:
[MCP servers with the Gemini CLI](https://geminicli.com/docs/tools/mcp-server).

- **Configuration:** Top-level `mcpServers` and optional global `mcp`
  allow/exclude rules inside the same `settings.json` merge layers as hooks.

- **Transports:** stdio (`command` / `args` / `cwd` / `env`), SSE (`url`),
  streamable HTTP (`httpUrl`); OAuth, trust, and tool allow/deny lists per
  server.

- **Operations:** `/mcp`, `/mcp auth`; tokens stored under
  `~/.gemini/mcp-oauth-tokens.json` for OAuth flows.

## Command

Reference:
[Custom commands](https://geminicli.com/docs/cli/custom-commands);
[Command reference](https://geminicli.com/docs/reference/commands).

- **Format:** TOML v1 with required `prompt` and optional `description`;
  namespaced paths map to slash commands (for example `git/commit.toml` →
  `/git:commit`).

- **Reload:** `/commands reload` after edits without restarting the CLI.

## Experimental

Reference: [Gemini CLI documentation](https://geminicli.com/docs/) (features
marked experimental in the index, including
[Subagents](https://geminicli.com/docs/core/subagents) and
[Plan mode](https://geminicli.com/docs/cli/plan-mode)).

TBD: stable ATP install paths for experimental core features as they graduate.

# Codex CLI

Reference (hub): [Codex CLI](https://developers.openai.com/codex/cli).

Related:
[Best practices](https://developers.openai.com/codex/learn/best-practices),
[Config basics](https://developers.openai.com/codex/config-basic),
[Model Context Protocol](https://developers.openai.com/codex/mcp),
[Agent Skills](https://developers.openai.com/codex/skills),
[Slash commands](https://developers.openai.com/codex/cli/slash-commands).

## Rule

Reference:
[Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md);
[Config basics](https://developers.openai.com/codex/config-basic) (config layers);
[Project instructions discovery](https://developers.openai.com/codex/config-advanced#project-instructions-discovery).

- **Global:** Under `~/.codex` (or `CODEX_HOME`), `AGENTS.override.md` wins over
  `AGENTS.md` when present; only one non-empty file applies at that level.

- **Project:** From repo root down to the current working directory, each
  directory contributes at most one of `AGENTS.override.md`, `AGENTS.md`, or
  names in `project_doc_fallback_filenames` in `config.toml`. Files concatenate
  root-to-leaf (later overrides earlier).

- **Limits:** Combined instruction size is capped by `project_doc_max_bytes`
  (default 32 KiB).

- **Scaffold:** `/init` creates a starter `AGENTS.md` in the current directory.

## Prompt

Reference:
[Prompting Codex](https://developers.openai.com/codex/prompting);
[Best practices](https://developers.openai.com/codex/learn/best-practices)
(context and prompts);
[Model Context Protocol](https://developers.openai.com/codex/mcp).

- **Session input:** Goals, constraints, and `@` file or folder mentions (see
  `/mention`) supply task context; durable rules belong in `AGENTS.md` or
  skills.

- **MCP:** Servers extend tools and context; configure under
  `[mcp_servers.<name>]` in `config.toml` or via `codex mcp add`. Use `/mcp`
  in the TUI to inspect tools.

## Skill

Reference:
[Agent Skills](https://developers.openai.com/codex/skills);
[open agent skills standard](https://agentskills.io/).

- **Format:** Directory with `SKILL.md` (YAML frontmatter with required `name`
  and `description`) plus optional scripts, references, and
  `agents/openai.yaml` for app metadata and invocation policy.

- **Discovery:** Repo paths from `$CWD` up to `$REPO_ROOT` (`.agents/skills`),
  user `$HOME/.agents/skills`, admin `/etc/codex/skills`, and bundled system
  skills. Symlinks are followed. Duplicate names can both appear in selectors.

- **Invocation:** Explicit `$skill` or `/skills`, or implicit when the
  description matches the task (`allow_implicit_invocation` in
  `agents/openai.yaml` can disable implicit use).

- **Distribution:**
  [Plugins](https://developers.openai.com/codex/plugins/build) package skills
  for sharing; `$skill-creator` and `$skill-installer` help author and fetch
  skills.

## Hook

Reference:
[Hooks](https://developers.openai.com/codex/hooks);
[Config basics](https://developers.openai.com/codex/config-basic#feature-flags)
(`codex_hooks`).

- **Status:** Experimental; under active development; temporarily disabled on
  Windows.

- **Enable:** Set `codex_hooks = true` under `[features]` in `config.toml` (or
  use `/experimental` per slash-commands docs).

- **Locations:** `hooks.json` beside active config layers, especially
  `~/.codex/hooks.json` and `<project>/.codex/hooks.json`. All matching files
  load; layers do not replace one another for hooks.

- **Shape:** Event names (for example `SessionStart`, `PreToolUse`,
  `PostToolUse`, `UserPromptSubmit`, `Stop`), matcher groups, and `command`-type
  handlers; JSON on stdin/out per the hooks doc.

- **Caveats:** Current `PreToolUse` / `PostToolUse` focus on `Bash`; matchers
  for other tool names may not match yet.

## Mcp

Reference:
[Model Context Protocol](https://developers.openai.com/codex/mcp);
[Config basics](https://developers.openai.com/codex/config-basic).

- **Storage:** `[mcp_servers.<name>]` tables in `~/.codex/config.toml` and
  trusted-project `.codex/config.toml` (CLI and IDE share layers). Use
  `codex mcp add` or edit TOML directly.

- **Transports:** Stdio (`command`, `args`, `env`, `cwd`, and related fields)
  and streamable HTTP (`url` with OAuth or bearer token env vars per server
  table).

- **TUI:** `/mcp` lists configured MCP tools in session.

## Command

Reference:
[Slash commands in Codex CLI](https://developers.openai.com/codex/cli/slash-commands);
[Agent Skills](https://developers.openai.com/codex/skills).

- **Built-in:** Fixed slash commands (for example `/model`, `/plan`, `/compact`,
  `/mcp`, `/init`) are product-defined; there is no documented user-authored
  slash-command file format comparable to Gemini custom commands.

- **Repeatable workflows:** Package them as
  [skills](https://developers.openai.com/codex/skills) (`$skill` or implicit
  activation) or document them in `AGENTS.md`.

## Experimental

Reference:
[Codex CLI](https://developers.openai.com/codex/cli);
[Hooks](https://developers.openai.com/codex/hooks);
[Subagents](https://developers.openai.com/codex/concepts/subagents);
[Config basics](https://developers.openai.com/codex/config-basic#feature-flags)
(feature maturity table).

TBD: ATP alignment as hooks and other flagged features stabilize (for example
Windows hooks, expanded tool events).
