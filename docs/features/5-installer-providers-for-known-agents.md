# Installer Providers for Known Agents

For all the types of parts that the packages support, we need ATP to have
provider logic that can complete the installation of the part by contributing
to creating or amending `mcp.json` or `hooks.json` as needed by different agents
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

## Support vs Type matrix

The Cursor column reflects [Cursor documentation](https://cursor.com/docs)
for Agent (Chat), hooks, and MCP. Paths are under `.cursor/` or `~/.cursor/`
unless noted. References for each type are under the matching Cursor subsection
below.

| Agent  | Type         | Sup. | JSON? | Where (summary)              |
|--------|--------------|------|-------|------------------------------|
| cursor | Rule         | Y    | N     | `.cursor/rules/`, AGENTS.md  |
| cursor | Prompt       | Part | N     | Chat UX; MCP Prompts         |
| cursor | Skill        | Y    | N     | `.cursor/skills/` etc.       |
| cursor | Hook         | Y    | Y     | `hooks.json` + scripts       |
| cursor | Mcp          | Y    | Y     | `mcp.json`                   |
| cursor | Command      | Part | N     | Slash cmds → skills          |
| cursor | Experimental | TBD  | —     | —                            |

Partial: Cursor docs do not define a project `prompts/` install like rules or
skills; MCP Prompts and `/migrate-to-skills` are the documented touchpoints.
Sup. = supported for provider work.

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

