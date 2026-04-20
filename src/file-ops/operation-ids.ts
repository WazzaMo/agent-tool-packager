/**
 * Named operation ids (values 1–12) from
 * docs/notes/2026-04-03-plan-installer-provider-file-operations.md.
 * Providers compose these for Feature 5 install targets (per-agent paths and formats).
 */

export const OperationIds = {
  /**
   * Parse, merge, and serialize structured agent config (JSON or TOML) so MCP, hooks,
   * feature flags, etc. are registered without clobbering unrelated keys. Examples:
   * `mcp.json`, Codex `config.toml` tables.
   */
  ConfigMerge: 1,

  /**
   * Combine portable rule sources (markdown body + YAML metadata) into the single
   * artefact each agent expects (e.g. Cursor `.mdc`, Claude `.md`) with correct
   * frontmatter and delimiters.
   */
  RuleAssembly: 2,

  /**
   * Copy or sync a directory tree for path-only discovery: skills, commands, hook
   * handler scripts, prompt conventions, assets.
   */
  TreeMaterialise: 3,

  /**
   * Patch or append layered instruction files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`):
   * managed blocks, import lines, or sidecars instead of replacing whole files.
   */
  MarkdownAggregate: 4,

  /**
   * Write or replace plain markdown where the agent does not use YAML frontmatter
   * in that location (e.g. some `AGENTS.md` or prompt snippets).
   */
  PlainMarkdownEmit: 5,

  /**
   * Generate a Gemini-style custom command `.toml` under `.gemini/commands/` with
   * required `prompt` and namespaced slash-command paths.
   */
  TomlCommandGenerate: 6,

  /**
   * Merge into Cursor/Codex-style `hooks.json`: event-keyed handler arrays, appending
   * without dropping existing handlers; respect schema/version where required.
   */
  HookJsonGraph: 7,

  /**
   * Merge into nested slices of `settings.json` (e.g. `mcpServers`, `hooks`) while
   * preserving other top-level keys — Claude Code and Gemini CLI merged settings.
   */
  SettingsNestedMerge: 8,

  /**
   * Install hook scripts, command binaries, or bundle executables and set the execute
   * bit (or platform equivalent); record paths for uninstall.
   */
  ExecutableInstall: 9,

  /**
   * After config merge, validate or normalise placeholders (`${env:…}`,
   * `${workspaceFolder}`, Codex-style expansion) in MCP and hook fields.
   */
  InterpolationValidate: 10,

  /**
   * Small, optional edits to human index files (e.g. a bullet in `AGENTS.md` pointing
   * at installed prompts or skills) without owning the entire file.
   */
  DiscoveryHint: 11,

  /**
   * Install **Experimental** parts via opaque or schema-light drops: arbitrary tree
   * copies or partial JSON/TOML until a stable schema exists.
   */
  ExperimentalDrop: 12,
} as const;

export type OperationId = (typeof OperationIds)[keyof typeof OperationIds];

/** Literal id for {@link OperationIds.PlainMarkdownEmit} (for type-only DTO imports). */
export type PlainMarkdownEmitOperationId = typeof OperationIds.PlainMarkdownEmit;

/** Literal id for {@link OperationIds.RuleAssembly}. */
export type RuleAssemblyOperationId = typeof OperationIds.RuleAssembly;

/** Literal id for {@link OperationIds.ConfigMerge}. */
export type ConfigMergeOperationId = typeof OperationIds.ConfigMerge;

/** Literal id for {@link OperationIds.HookJsonGraph}. */
export type HookJsonGraphOperationId = typeof OperationIds.HookJsonGraph;

/** Literal id for {@link OperationIds.TreeMaterialise}. */
export type TreeMaterialiseOperationId = typeof OperationIds.TreeMaterialise;

/** Literal id for {@link OperationIds.MarkdownAggregate}. */
export type MarkdownAggregateOperationId = typeof OperationIds.MarkdownAggregate;

/** Literal id for {@link OperationIds.ExperimentalDrop}. */
export type ExperimentalDropOperationId = typeof OperationIds.ExperimentalDrop;

/** Literal id for {@link OperationIds.InterpolationValidate}. */
export type InterpolationValidateOperationId = typeof OperationIds.InterpolationValidate;

/** Literal id for {@link OperationIds.DiscoveryHint}. */
export type DiscoveryHintOperationId = typeof OperationIds.DiscoveryHint;
