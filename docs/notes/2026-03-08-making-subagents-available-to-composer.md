# Making subagents available to Composer

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.
Created 2025-03-08.

---------------------------------------------------------------------------

## Current state

Composer (the main AI agent in Cursor) has access to an `mcp_task` tool that
launches subagents. At present, only one subagent type is exposed:

| Subagent type   | Purpose                                              |
|-----------------|------------------------------------------------------|
| generalPurpose  | Research, code search, multi-step tasks              |

The subagents described in `subagents.md` (Explore, Bash, Browser, Orchestrator,
Product-Manager, Copy-writer, Software Engineers, Security-auditor, test-runner)
are not invocable through this interface. Composer cannot delegate to them.

## Cursor's subagent model (from official docs)

Cursor's [subagents documentation](https://cursor.com/docs/subagents) describes:

| Category | Subagents | How they work |
|----------|-----------|---------------|
| Built-in | Explore, Bash, Browser | Agent uses them automatically for context-heavy tasks |
| Custom | Any defined in project | Markdown files in `.cursor/agents/` or `~/.cursor/agents/` |

Custom subagents are markdown files with YAML frontmatter (`name`, `description`,
`model`, `readonly`, `background`). Agent "includes all custom subagents in its
available tools" and can invoke them via `/name` syntax or natural language.

The [Creating subagents](https://cursor.com/docs/subagents#creating-subagents)
section states: "create custom subagents manually by adding markdown files to
`.cursor/agents/` (project) or `~/.cursor/agents/` (user)". All examples use
the `.md` extension (e.g. `verifier.md`, `debugger.md`, `test-runner.md`).

## Are the subagent files correctly located?

Yes. The ATP project has subagent files in `.cursor/agents/`, which matches the
documented location. The directory is correct.

## Why the existing subagent files are not usable

The ATP project defines six custom subagents in `.cursor/agents/` (orchestrator,
test-runner, security-auditor, copy-writer, product-manager, software-engineer).
Despite correct location and valid YAML frontmatter, Composer cannot invoke them.
The following factors explain why.

### File extension

The Cursor docs consistently show subagent files with `.md` extension. Examples:

- `verifier.md`, `debugger.md`, `test-runner.md`, `security-reviewer.md`

The ATP files are named without extension (e.g. `orchestrator`, `test-runner`).
If Cursor discovers subagents by file extension, files without `.md` may be
ignored. Renaming to `orchestrator.md`, `test-runner.md`, etc. may be required.

### Model field values

The docs list valid `model` values: `fast`, `inherit`, or a specific model ID.
The ATP subagents use `model: auto` (test-runner) and `model: composer-1.5`
(orchestrator). These values are not documented. Invalid model values could
cause Cursor to skip or misconfigure the subagents.

### Composer vs Agent tool access

The docs refer to "Agent" as the entity that "includes all custom subagents
in its available tools" and sends "Task tool calls". Composer may be a
different interface with a different tool set. Composer's `mcp_task` tool
only exposes `generalPurpose` as a subagent type; it does not list custom
subagents from `.cursor/agents/`. If Composer and Agent use different tool
interfaces, Composer may never see the custom subagent dispatch capability,
regardless of file location or format.

### Summary of likely causes

| Cause | Fix to try |
|-------|------------|
| Missing `.md` extension | Rename files to `*.md` |
| Invalid `model` values | Use `fast`, `inherit`, or documented model ID |
| Composer lacks Task tool | Requires Cursor product change or investigation |

### Immediate actions to try

Before concluding that Composer lacks the Task tool, try the fixes that are under
project control:

1. **Rename to `.md`** — Rename each file in `.cursor/agents/` to add the `.md`
   extension (e.g. `test-runner` → `test-runner.md`). The [Creating subagents](https://cursor.com/docs/subagents#creating-subagents)
   section and all examples use `.md`; Cursor may only discover markdown files.

2. **Fix model values** — Change `model: auto` to `model: fast` or `model: inherit`.
   Change `model: composer-1.5` to `model: inherit` or a documented model ID.
   The docs list only `fast`, `inherit`, or a specific model ID.

If these changes do not make the subagents available to Composer, the remaining
cause is likely that Composer uses a different tool interface than Agent and
does not have access to the Task/subagent dispatch mechanism.

## Gap

Composer cannot invoke the planned subagents because:

1. The `mcp_task` tool only enumerates `generalPurpose` as a valid
   `subagent_type`; other types are not exposed.

2. Cursor's built-in subagents (Explore, Bash, Browser) and custom subagents
   (`.cursor/agents/*.md`) may be exposed through a different tool interface
   than `mcp_task`. The docs refer to "Task tool calls" and Agent having
   subagents "in its available tools" — it is unclear whether Composer sees
   the same tools.

3. The custom subagents in `subagents.md` (Orchestrator, Product-Manager, etc.)
   could be implemented as Cursor custom subagents in `.cursor/agents/`, but
   only if Composer has access to the Task/subagent dispatch tool that the
   docs describe.

## Options to make subagents available

### Option A: Cursor configuration and API

Investigate whether Cursor exposes additional subagent types through:

- MCP server configuration (e.g. a Cursor MCP that provides subagent dispatch)
- Cursor settings or `.cursor` project config
- Cursor's own documentation on subagents and agent orchestration

If Cursor supports multiple subagent types, the `mcp_task` (or equivalent)
tool may need to be configured or extended to expose them.

### Option B: MCP servers as subagent proxies

Implement MCP servers that embody each subagent role. For example:

- An "Explore" MCP that searches code and returns summaries
- A "test-runner" MCP that runs tests and reports results
- A "Security-auditor" MCP that performs security checks

Composer could then invoke these via MCP tools rather than via a subagent
dispatch mechanism. The subagent becomes a tool, not a separate agent process.

### Option C: ATP packages and skills

Define ATP packages (skills or rules) that encode subagent behaviour:

- Prompts and instructions for each role (Orchestrator, Product-Manager, etc.)
- Installed into the project's Safehouse and agent directories
- Composer uses them as context when performing that role, or delegates by
  including the relevant prompt in a `generalPurpose` task description

This does not create true subagent processes but gives Composer role-specific
guidance it can apply or pass through.

### Option D: generalPurpose with role-specific prompts

Use the existing `generalPurpose` subagent and pass role instructions in the
task `prompt`. For example:

- "Act as the Orchestrator: divide this task into smaller focussed tasks"
- "Act as the test-runner: run tests and report failures"

The subagent type stays `generalPurpose`, but the prompt encodes the role.
This works today without any new infrastructure.

## Recommendation

1. **Short term:** Use Option D. Document standard prompts for each subagent
   role in `subagents.md` or a companion file. Composer can invoke
   `generalPurpose` with those prompts when delegation is appropriate.

2. **Investigation:** Pursue Option A. Check Cursor docs and config for
   subagent types and whether more can be exposed to Composer.

3. **Medium term:** Consider Option B for roles that benefit from dedicated
   tools (e.g. test-runner, Security-auditor). MCP servers can encapsulate
   tooling that a single prompt cannot.

4. **ATP integration:** Option C aligns with ATP's package model. Subagent
   prompts could be ATP skills or rules, installed per project, and versioned
   in the catalog.

## References

- [Cursor subagents documentation](https://cursor.com/docs/subagents) — built-in and custom subagents, file format, invocation
- [Creating subagents](https://cursor.com/docs/subagents#creating-subagents) — file locations, manual creation, .md extension
- [subagents.md](../../subagents.md) — planned agent roles
- [AGENTS.md](../../AGENTS.md) — project summary for AI agents
