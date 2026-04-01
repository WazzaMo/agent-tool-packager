# Installer Providers for Known Agents

For all the types of parts that the packages support, we need ATP to have
provider logic that can complete the installation of the part by contributing
to creating or amending `mcp.json`, `hooks.json`, or (for Claude Code and
Gemini CLI) hook and `mcpServers` entries inside `settings.json`, as needed
by different agents
for different types. Sometimes it is enough to write markdown to the correct directory
and sometimes more is needed.

## Copyright

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created by Warwick Molloy Feb 2026.

# Agents and type support

## Definition of types

Adapted from [Feature 2 - sec: Explore the workflow for package devs](./2-package-developer-support.md).

Types can be:
  1.  Rule - prompt material, usually markdown, installed under the agent
      rules area (for example Cursor `rules/`).
  2.  Prompt - reusable prompt templates or instruction files, usually markdown,
      installed under the agent prompts area (for example Cursor `prompts/`).
  3.  Skill - markdown file describing for the agent, how to do achieve
      an outcome or a goal.
  4.  Hook - agent hook configuration and scripts (for example `hooks.json` plus
      executables under a `hooks/` directory). Cursor, Claude Code, and Kiro (and
      related agents) support hook-style extension of the agent loop; see
      [Cursor Hooks](https://cursor.com/docs/hooks) for the reference layout ATP
      aligns with for Cursor installs.
  5.  Mcp servers which could vary in implementation
  6.  Command, which can be shell scripts, or other executables, that automate different workflows
  7.  Experimental payloads to install into a project of a type the
      industry is yet to define.

The "Prompt" type in most cases could be implemented as a standard, in-project directory,
of `installed-prompts/` where markdown files can be copied. They become installed context
documents that an AI Agent might consume. An option is to add a hint to AGENTS.md to read
the `installed-prompts/` directory.

Experimental is a special-case type that will require more configurable installation instructions
and is intended for support for brand new extension points that a particular agent may implement.
The field of AI Agent development tools is moving so fast "experimental" just seemed to make sense
as a break-out, "other" type.


## Support vs Type matrix

Each row reflects that product's official docs. The `claude` rows map
to **Claude Code** (terminal/IDE), per
[Extend Claude Code](https://code.claude.com/docs/en/features-overview).
The `gemini` rows map to **Gemini CLI**, per the
[Gemini CLI documentation](https://geminicli.com/docs/) hub.
Cursor paths use `.cursor/` or `~/.cursor/`; Claude Code uses `.claude/`,
project-root files such as `CLAUDE.md` and `.mcp.json`, and `~/.claude/`;
Gemini CLI uses `.gemini/` and `~/.gemini/` (including `settings.json` for
hooks and MCP).
References for each type are under the matching **Cursor**, **Claude Code**,
or **Gemini CLI** subsection below.

| Agent  | Type         | Sup. | JSON? | Where (summary)                      |
|--------|--------------|------|-------|--------------------------------------|
| cursor | Rule         | Y    | N     | `.cursor/rules/`, AGENTS.md          |
| cursor | Prompt       | Part | N     | Chat UX; MCP Prompts                 |
| cursor | Skill        | Y    | N     | `.cursor/skills/` etc.               |
| cursor | Hook         | Y    | Y     | `hooks.json` + scripts               |
| cursor | Mcp          | Y    | Y     | `mcp.json`                           |
| cursor | Command      | Part | N     | Slash cmds → skills                  |
| cursor | Experimental | TBD  | —     | —                                    |
| claude | Rule         | Y    | N     | `CLAUDE.md`, `.claude/rules/`        |
| claude | Prompt       | Part | N     | Chat UX; MCP; @ MCP resources        |
| claude | Skill        | Y    | N     | `.claude/skills/` etc.               |
| claude | Hook         | Y    | Y     | `hooks` in `settings.json` + scripts |
| claude | Mcp          | Y    | Y     | `.mcp.json`, `~/.claude.json`        |
| claude | Command      | Y    | N     | `.claude/commands/` (skill-style)    |
| claude | Experimental | TBD  | —     | —                                    |
| gemini | Rule         | Y    | N     | `GEMINI.md`, `~/.gemini/GEMINI.md`   |
| gemini | Prompt       | Part | N     | Chat UX; MCP; `.toml` custom cmds    |
| gemini | Skill        | Y    | N     | `.gemini/skills/`, `.agents/skills/` |
| gemini | Hook         | Y    | Y     | `hooks` in `settings.json` + scripts |
| gemini | Mcp          | Y    | Y     | `mcpServers` in `settings.json`      |
| gemini | Command      | Y    | N     | `.gemini/commands/*.toml`            |
| gemini | Experimental | TBD  | —     | —                                    |

Partial: no first-class on-disk Prompt install like rules or skills; chat UX
and MCP capabilities are the documented touchpoints. Cursor: MCP Prompts and
`/migrate-to-skills`. Claude Code: MCP resources via `@`. Gemini CLI:
[Custom commands](https://geminicli.com/docs/cli/custom-commands) (TOML
prompts) and MCP resources via `@`. Sup. = supported for provider work.

# Cursor

Reference (hub): [Cursor documentation](https://cursor.com/docs).

## Rule

Reference: [Rules](https://cursor.com/docs/context/rules).

- **Project rules:** Markdown in `.cursor/rules/` (`.md` or `.mdc` with frontmatter: `description`, `globs`, `alwaysApply`). Application modes include always, intelligent, glob-scoped, and manual `@` mention.
- **AGENTS.md:** Plain markdown at repo root (and nested paths) as a simpler alternative to `.cursor/rules/`.
- **User rules:** Cursor Settings → Rules, Agent (Chat) only (not Inline Edit). **Team rules:** dashboard on Team/Enterprise plans; precedence Team → Project → User.

## Prompt

Reference: [Prompting agents](https://cursor.com/docs/agent/prompting) (chat UX); [MCP](https://cursor.com/docs/mcp) (MCP Prompts capability on servers).

- **Agent chat:** Prompting covers `@` context, images, voice, and models, not a separate on-disk prompts package format.
- **MCP:** The MCP integration documents **Prompts** as a supported capability of MCP servers (templated messages/workflows), alongside Tools, Resources, etc.

## Skill

Reference: [Agent Skills](https://cursor.com/docs/skills).

- **Layout:** Each skill is a directory with `SKILL.md` (YAML frontmatter: required `name`, `description`; optional `license`, `compatibility`, `metadata`, `disable-model-invocation`). Optional `scripts/`, `references/`, `assets/`.
- **Discovery:** `.agents/skills/`, `.cursor/skills/`, `~/.cursor/skills/`, plus `.claude/skills/`, `.codex/skills/`, and global variants for compatibility.

## Hook

Reference: [Hooks](https://cursor.com/docs/hooks).

- **Config:** `hooks.json` with `"version": 1` and a `hooks` object mapping event names to arrays of hook definitions.
- **Locations (priority high → low):** enterprise (OS-specific paths), team (cloud), project `.cursor/hooks.json`, user `~/.cursor/hooks.json`. Project hooks run from repo root; user hooks from `~/.cursor/`.
- **Types:** Default **command** hooks (stdin/stdout JSON); optional **prompt** hooks (`type: "prompt"`) evaluated by a fast model. Agent vs Tab use different event sets.

## Mcp

Reference: [MCP](https://cursor.com/docs/mcp).

- **Config file:** JSON with `mcpServers` entries. **Project:** `.cursor/mcp.json`. **Global:** `~/.cursor/mcp.json`.
- **Transports:** stdio (`type`, `command`, `args`, `env`, `envFile`), remote `url` with optional `headers` and static OAuth `auth`. Variable interpolation in selected fields (`${env:…}`, `${workspaceFolder}`, etc.).

## Command

Reference: [Slash commands](https://cursor.com/docs/cli/reference/slash-commands); [Agent Skills](https://cursor.com/docs/skills) (slash-command migration).

- **CLI:** Slash commands such as `/commands` (create or edit commands) are listed in the slash-commands reference.
- **Skills overlap:** `/migrate-to-skills` (Cursor 2.4+) converts eligible slash commands into skills under `.cursor/skills/` with explicit invocation.

## Experimental

Reference: [Cursor documentation](https://cursor.com/docs) (no page specific to this ATP type yet).

TBD: provider mapping when Cursor documents a stable install surface.

# Claude Code

Reference (hub): [Extend Claude Code](https://code.claude.com/docs/en/features-overview)
(feature map: CLAUDE.md, Skills, MCP, Subagents, Hooks, Plugins). Companion
guides: [How Claude remembers your project](https://code.claude.com/docs/en/memory),
[Skills](https://code.claude.com/docs/en/skills), [Hooks reference](https://code.claude.com/docs/en/hooks),
[MCP](https://code.claude.com/docs/en/mcp).

## Rule

Reference: [How Claude remembers your project](https://code.claude.com/docs/en/memory);
[Extend Claude Code](https://code.claude.com/docs/en/features-overview) (CLAUDE.md vs rules vs skills).

- **CLAUDE.md:** Project instructions at `./CLAUDE.md` or `./.claude/CLAUDE.md`, plus user `~/.claude/CLAUDE.md` and managed policy paths. Content loads every session; hierarchy walks ancestors and lazy-loads nested `CLAUDE.md` files. Imports use `@path` syntax.
- **`.claude/rules/`:** Markdown rules (recursive `.md`), optionally path-scoped with YAML `paths` frontmatter. User rules in `~/.claude/rules/` apply before project rules.
- **AGENTS.md:** Not read natively; the memory guide recommends importing it from `CLAUDE.md` so Claude Code and other agents share one file.

## Prompt

Reference: [Extend Claude Code](https://code.claude.com/docs/en/features-overview)
(on-demand skills vs always-on memory); [MCP](https://code.claude.com/docs/en/mcp)
(protocol capabilities).

- **Chat:** Natural-language prompts and context are session input, not a separate packaged prompts directory in the extension model.
- **MCP:** Servers can expose tools, prompts, resources, and (with notifications) updated capabilities; resources are attachable via `@` mentions per the MCP guide.

## Skill

Reference: [Skills](https://code.claude.com/docs/en/skills); [Extend Claude Code](https://code.claude.com/docs/en/features-overview).

- **Standard:** Skills follow the [Agent Skills](https://agentskills.io/) open standard with Claude Code extensions (invocation control, `context: fork`, dynamic injection, optional `hooks` in frontmatter).
- **Locations:** Enterprise (managed), `~/.claude/skills/<name>/SKILL.md`, `.claude/skills/<name>/SKILL.md`, plugins under `skills/`, and nested package `.claude/skills/` in monorepos. Name collisions resolve managed > personal > project; plugin skills are namespaced.

## Hook

Reference: [Hooks reference](https://code.claude.com/docs/en/hooks); quickstart
[Automate workflows with hooks](https://code.claude.com/en/hooks-guide); [Extend Claude Code](https://code.claude.com/docs/en/features-overview).

- **Configuration:** Hooks live under a `hooks` object in JSON settings, not a standalone `hooks.json`: `~/.claude/settings.json` (user), `.claude/settings.json` (project), `.claude/settings.local.json` (local), managed policy, plugin `hooks/hooks.json`, or skill/agent frontmatter for scoped lifecycle hooks.
- **Handlers:** `command`, `http`, `prompt`, and `agent` handler types; matcher groups filter events such as `PreToolUse`, `PostToolUse`, `SessionStart`, `InstructionsLoaded`, etc. Scripts often live under `.claude/hooks/` and are referenced with `$CLAUDE_PROJECT_DIR`.
- **Merge:** All matching hooks from every source run; see the features overview layering table (hooks merge).

## Mcp

Reference: [MCP](https://code.claude.com/docs/en/mcp); [Extend Claude Code](https://code.claude.com/docs/en/features-overview).

- **CLI:** `claude mcp add` with transports stdio, HTTP (preferred for remote), or SSE (deprecated where HTTP exists); scopes `local`, `project` (`.mcp.json` at repo root, `mcpServers`), and `user` (`~/.claude.json`). Precedence: local > project > user when names collide.
- **Extras:** OAuth, `headersHelper`, env expansion in `.mcp.json`, plugins bundling `.mcp.json`, optional Claude.ai connectors, and `/mcp` for status and auth.

## Command

Reference: [Skills](https://code.claude.com/docs/en/skills) (custom commands merged into skills); [built-in commands](https://code.claude.com/en/commands).

- **Custom commands:** A markdown file at `.claude/commands/<name>.md` defines the same `/name` slash entry as `.claude/skills/<name>/SKILL.md`; skills are the superset (frontmatter, supporting files). If both exist for one name, the skill wins.
- **Built-in:** Fixed-logic slash commands (for example `/compact`, `/init`) are documented separately from user skills.

## Experimental

Reference: [Extend Claude Code](https://code.claude.com/docs/en/features-overview)
(agent teams marked experimental; plugins and marketplaces as packaging).

TBD: which experimental surfaces get stable ATP install paths (for example
agent teams, channel-only workflows).

# Gemini CLI

Reference (hub): [Gemini CLI documentation](https://geminicli.com/docs/).
Feature index covers [Agent Skills](https://geminicli.com/docs/cli/skills),
[Hooks](https://geminicli.com/docs/hooks), [MCP servers](https://geminicli.com/docs/tools/mcp-server),
[Custom commands](https://geminicli.com/docs/cli/custom-commands), and
[Extensions](https://geminicli.com/docs/extensions).

## Rule

Reference: [Project context (GEMINI.md)](https://geminicli.com/docs/cli/gemini-md);
[Memory import processor](https://geminicli.com/docs/reference/memport).

- **Hierarchy:** Global `~/.gemini/GEMINI.md`, workspace `GEMINI.md` files (parents of configured workspaces), and just-in-time files when tools touch paths (ancestors up to a trusted root). Contents concatenate into context for prompts.
- **Imports:** `@path` syntax pulls other markdown files; see the memport reference for processing rules.
- **Alternate names:** `context.fileName` in `settings.json` can list filenames such as `AGENTS.md` alongside `GEMINI.md`.
- **Commands:** `/memory show`, `/memory reload`, `/memory add` for inspection and global append.

## Prompt

Reference: [Custom commands](https://geminicli.com/docs/cli/custom-commands);
[MCP servers](https://geminicli.com/docs/tools/mcp-server) (tools, resources, prompts).

- **Chat:** Session prompts and context are primary input; there is no separate vendor-defined prompts directory beyond context files and commands.
- **Custom commands:** Reusable prompts live as `.toml` files under `~/.gemini/commands/` and `.gemini/commands/` (project overrides user on name clash), with optional `{{args}}`, `!{...}` shell injection, and `@{...}` file injection.
- **MCP:** `/mcp` lists tools and prompts; resource URIs can be attached with `@server://resource/path` syntax per the MCP guide.

## Skill

Reference: [Agent Skills](https://geminicli.com/docs/cli/skills);
[Create Agent Skills](https://geminicli.com/docs/cli/creating-skills);
[Extensions](https://geminicli.com/docs/extensions).

- **Standard:** Based on [Agent Skills](https://agentskills.io/); discovery injects name and description into the system prompt; activation uses the `activate_skill` tool with user consent, then loads `SKILL.md` and grants the skill directory on the allow path.
- **Tiers:** Workspace `.gemini/skills/` or `.agents/skills/` (within tier, `.agents/skills/` wins over `.gemini/skills/`), user `~/.gemini/skills/` or `~/.agents/skills/`, and extension-bundled skills. Precedence: workspace > user > extension.
- **Management:** `/skills` and `gemini skills` for list, link, install, enable, and disable.

## Hook

Reference: [Gemini CLI hooks](https://geminicli.com/docs/hooks);
[Hooks reference](https://geminicli.com/docs/hooks/reference);
[Writing hooks](https://geminicli.com/docs/hooks/writing-hooks).

- **Configuration:** `hooks` object in merged `settings.json` (project `.gemini/settings.json`, user `~/.gemini/settings.json`, system `/etc/gemini-cli/settings.json`, plus extensions). Not a standalone `hooks.json`.
- **Handlers:** Currently `type: "command"` with `command`, optional `matcher`, `timeout` (ms), `name`. JSON on stdin/stdout; exit `0` with JSON decisions, `2` for a hard block, other codes as warnings.
- **Scripts:** Often under `.gemini/hooks/`; `$GEMINI_PROJECT_DIR` (and `CLAUDE_PROJECT_DIR` alias) identifies the project root.
- **UI:** `/hooks panel`, `/hooks enable|disable`, `/hooks enable-all|disable-all`.

## Mcp

Reference: [MCP servers with the Gemini CLI](https://geminicli.com/docs/tools/mcp-server).

- **Configuration:** Top-level `mcpServers` and optional global `mcp` allow/exclude rules inside the same `settings.json` merge layers as hooks.
- **Transports:** stdio (`command` / `args` / `cwd` / `env`), SSE (`url`), streamable HTTP (`httpUrl`); OAuth, trust, and tool allow/deny lists per server.
- **Operations:** `/mcp`, `/mcp auth`; tokens stored under `~/.gemini/mcp-oauth-tokens.json` for OAuth flows.

## Command

Reference: [Custom commands](https://geminicli.com/docs/cli/custom-commands);
[Command reference](https://geminicli.com/docs/reference/commands).

- **Format:** TOML v1 with required `prompt` and optional `description`; namespaced paths map to slash commands (for example `git/commit.toml` → `/git:commit`).
- **Reload:** `/commands reload` after edits without restarting the CLI.

## Experimental

Reference: [Gemini CLI documentation](https://geminicli.com/docs/) (features
marked experimental in the index, including [Subagents](https://geminicli.com/docs/core/subagents)
and [Plan mode](https://geminicli.com/docs/cli/plan-mode)).

TBD: stable ATP install paths for experimental core features as they graduate.

