# Plan: Provider internal DTOs (step 2)

(c) Copyright 2026 Warwick Molloy.
Contribution to this project is supported and contributors will be recognised.

This note defines **internal DTOs** for the install pipeline: neutral data shapes
that describe *what* to do before serializers touch disk. It implements step 2
from
[2026-04-03-plan-installer-provider-file-operations](./2026-04-03-plan-installer-provider-file-operations.md)
and consumes the contract in
[2026-04-03-plan-provider-capability-matrix](./2026-04-03-plan-provider-capability-matrix.md).

# Goals

- One **ordered plan** per logical install unit (typically one package part ×
  target agent × layer).

- **Discriminated** action types so handlers stay small and testable.

- **Provenance** on every action so reinstall is idempotent and uninstall can
  remove ATP-owned fragments.

- Keep payloads **close to serialized form** (JSON-like objects, UTF-8 strings,
  path lists) without baking in Node APIs.

# Shared types

```typescript
/** Install scope; v1 may implement project only. */
type InstallLayer = "project" | "user" | "global";

/** Canonical agent keys (align with Feature 5 / atp-config). */
type AgentId = "cursor" | "claude" | "gemini" | "codex";

/** Package part kinds (Feature 2 / Feature 4). */
type PartKind =
  | "Rule"
  | "Prompt"
  | "Skill"
  | "Hook"
  | "Mcp"
  | "Command"
  | "Experimental";

/**
 * Named operation ids (values 1–12 match sections in
 * 2026-04-03-plan-installer-provider-file-operations.md).
 * Use `OperationIds.X` in code and logs; use type `OperationId` when any id is allowed.
 */
export const OperationIds = {
  ConfigMerge: 1,
  RuleAssembly: 2,
  TreeMaterialise: 3,
  MarkdownAggregate: 4,
  PlainMarkdownEmit: 5,
  TomlCommandGenerate: 6,
  HookJsonGraph: 7,
  SettingsNestedMerge: 8,
  ExecutableInstall: 9,
  InterpolationValidate: 10,
  DiscoveryHint: 11,
  ExperimentalDrop: 12,
} as const;

export type OperationId = (typeof OperationIds)[keyof typeof OperationIds];

/**
 * Optional: classic enum for the same numeric values (pick one style in code).
 *
 *   enum OperationIdEnum {
 *     ConfigMerge = 1,
 *     RuleAssembly = 2,
 *     TreeMaterialise = 3,
 *     MarkdownAggregate = 4,
 *     PlainMarkdownEmit = 5,
 *     TomlCommandGenerate = 6,
 *     HookJsonGraph = 7,
 *     SettingsNestedMerge = 8,
 *     ExecutableInstall = 9,
 *     InterpolationValidate = 10,
 *     DiscoveryHint = 11,
 *     ExperimentalDrop = 12,
 *   }
 */

/**
 * Stable identity for merge keys and uninstall.
 * fragmentKey examples: MCP server name, hook handler id, rule basename.
 */
interface AtpProvenance {
  packageName: string;
  packageVersion?: string;
  partIndex?: number;
  partKind?: PartKind;
  fragmentKey: string;
}

/** Resolved roots for path interpretation (absolute in practice). */
interface InstallContext {
  agent: AgentId;
  layer: InstallLayer;
  projectRoot: string;
  /** Layer root: e.g. project root, ~/.cursor, ~/.claude — policy TBD. */
  layerRoot: string;
  /** Staged extract dir for this install transaction. */
  stagingDir: string;
}
```

Later snippets are split for readability; treat them as one module where
`OperationIds` and `OperationId` stay in scope.

# Provider plan container

```typescript
/**
 * Full ordered list of side effects for one provider run.
 * Executor walks in order; same fragmentKey may appear in multiple actions
 * (e.g. tree then config) if handlers coordinate.
 */
interface ProviderPlan {
  context: InstallContext;
  provenanceBase: Pick<AtpProvenance, "packageName" | "packageVersion" | "partIndex" | "partKind">;
  actions: ProviderAction[];
}
```

# ProviderAction union

Top-level discriminant **`kind`**. Each variant pins **`operationId`** to a
single `OperationIds` member for tracing and matrix coverage.

```typescript
type ProviderAction =
  | JsonDocumentMergeAction
  | SettingsJsonSliceMergeAction
  | TomlDocumentMergeAction
  | HookJsonGraphMergeAction
  | FileTreeMaterializeAction
  | AssembledRuleWriteAction
  | PlainMarkdownWriteAction
  | MarkdownManagedBlockPatchAction
  | TomlCommandWriteAction
  | ExecutableMaterializeAction
  | InterpolationPolicyAction
  | DiscoveryHintAppendAction
  | OpaquePayloadAction;
```

## Config patch DTOs (ops 1, 7, 8)

### JsonDocumentMergeAction — op **1** (whole-file JSON)

For `mcp.json`, `.mcp.json`, `~/.claude.json` slices that are **one JSON
document** per file.

```typescript
interface JsonDocumentMergeAction {
  kind: "json_document_merge";
  operationId: typeof OperationIds.ConfigMerge;
  provenance: AtpProvenance;
  /** Relative to layerRoot unless absolute policy says otherwise. */
  relativeTargetPath: string;
  /**
   * How to merge `payload` into the document root or a named subtree.
   * Exact merge rules live in the serializer; DTO only names the strategy.
   */
  merge: JsonMergeStrategy;
  /** ATP-owned subtree (e.g. { mcpServers: { myServer: {...} } }). */
  payload: unknown;
}

type JsonMergeStrategy =
  | { mode: "deep_assign_paths"; paths: string[][] }
  | { mode: "replace_at_pointer"; jsonPointer: string };
```

### SettingsJsonSliceMergeAction — op **8**

For `hooks` or `mcpServers` **inside** `settings.json` without owning the whole
file.

```typescript
interface SettingsJsonSliceMergeAction {
  kind: "settings_json_slice_merge";
  operationId: typeof OperationIds.SettingsNestedMerge;
  provenance: AtpProvenance;
  relativeTargetPath: string;
  slice: "hooks" | "mcpServers" | "mcp";
  merge: SettingsSliceMergeMode;
  payload: unknown;
}

type SettingsSliceMergeMode =
  | { mode: "mcp_servers_by_name" }
  | { mode: "hooks_append_events"; events: string[] };
```

### HookJsonGraphMergeAction — op **7**

For Cursor/Codex **`hooks.json`**: `hooks[event] -> array` append or replace-by
id.

```typescript
interface HookJsonGraphMergeAction {
  kind: "hook_json_graph_merge";
  operationId: typeof OperationIds.HookJsonGraph;
  provenance: AtpProvenance;
  relativeTargetPath: string;
  version: 1;
  /** Per-event handler definitions to merge. */
  hooksDelta: Record<string, unknown[]>;
  /** How to match existing handlers for idempotent updates. */
  dedupe: "by_provenance_tag" | "replace_fragment_key";
}
```

### TomlDocumentMergeAction — op **1** (TOML)

For Codex **`config.toml`** (`[mcp_servers.name]`, `[features]`).

```typescript
interface TomlDocumentMergeAction {
  kind: "toml_document_merge";
  operationId: typeof OperationIds.ConfigMerge;
  provenance: AtpProvenance;
  relativeTargetPath: string;
  merge: TomlMergeStrategy;
  /** Serializable tables; serializer turns into TOML. */
  tables: Record<string, Record<string, unknown>>;
}

type TomlMergeStrategy =
  | { mode: "replace_table"; table: string }
  | { mode: "merge_table_keys"; table: string };
```

## Tree and file DTOs (op 3, 9)

```typescript
interface FileTreeMaterializeAction {
  kind: "file_tree_materialize";
  operationId: typeof OperationIds.TreeMaterialise;
  provenance: AtpProvenance;
  /** Source root under stagingDir (relative) or absolute staging path. */
  sourceRelativeToStaging: string;
  /** Destination directory relative to layerRoot. */
  destRelativeDir: string;
  overwrite: "atp_managed_only" | "never" | "always";
  /** Optional filter glob list relative to source root. */
  include?: string[];
}

interface ExecutableMaterializeAction {
  kind: "executable_materialize";
  operationId: typeof OperationIds.ExecutableInstall;
  provenance: AtpProvenance;
  /** Same as tree, but marks files for chmod +x (or platform equivalent). */
  sourceRelativeToStaging: string;
  destRelativeDir: string;
  filenames: string[];
}
```

## Rule assembly DTO (op 2)

```typescript
type RuleArtifactFormat = "cursor_mdc" | "cursor_md" | "claude_rule_md" | "plain_md";

interface AssembledRuleWriteAction {
  kind: "assembled_rule_write";
  operationId: typeof OperationIds.RuleAssembly;
  provenance: AtpProvenance;
  format: RuleArtifactFormat;
  /** Relative path including filename under layerRoot. */
  relativeTargetPath: string;
  /** YAML without document start, or structured map serialized to YAML. */
  frontmatterYaml: string;
  bodyMarkdown: string;
  encoding: "utf-8";
}
```

Serializer joins `---` / newlines per format.

## Markdown DTOs (ops 4, 5)

```typescript
interface PlainMarkdownWriteAction {
  kind: "plain_markdown_write";
  operationId: typeof OperationIds.PlainMarkdownEmit;
  provenance: AtpProvenance;
  relativeTargetPath: string;
  writeMode: "create_or_replace" | "create_only";
  content: string;
}

interface MarkdownManagedBlockPatchAction {
  kind: "markdown_managed_block_patch";
  operationId: typeof OperationIds.MarkdownAggregate;
  provenance: AtpProvenance;
  relativeTargetPath: string;
  /** Delimiters must be unique in file; executor inserts or replaces region. */
  beginMarker: string;
  endMarker: string;
  body: string;
  ifMissing: "append_to_file" | "create_file" | "fail";
}
```

## Gemini command DTO (op 6)

```typescript
interface TomlCommandWriteAction {
  kind: "toml_command_write";
  operationId: typeof OperationIds.TomlCommandGenerate;
  provenance: AtpProvenance;
  /** e.g. .gemini/commands/ns/cmd.toml */
  relativeTargetPath: string;
  /** TOML-ready fields; serializer enforces Gemini custom-command shape. */
  fields: Record<string, unknown>;
  writeMode: "create_or_replace" | "create_only";
}
```

## Validation / hints (ops 10, 11)

```typescript
interface InterpolationPolicyAction {
  kind: "interpolation_policy";
  operationId: typeof OperationIds.InterpolationValidate;
  provenance: AtpProvenance;
  /** Refers to a prior action by index or logical ref — executor-defined. */
  targetActionRef: string;
  policy: "validate_only" | "normalize_workspace_paths";
}

interface DiscoveryHintAppendAction {
  kind: "discovery_hint_append";
  operationId: typeof OperationIds.DiscoveryHint;
  provenance: AtpProvenance;
  relativeTargetPath: string;
  bulletMarkdownLine: string;
  ifMissingFile: "skip" | "create_minimal";
}
```

## Experimental (op 12)

```typescript
interface OpaquePayloadAction {
  kind: "opaque_payload";
  operationId: typeof OperationIds.ExperimentalDrop;
  provenance: AtpProvenance;
  /** Registry maps agent + experimental id → handler. */
  handlerId: string;
  payload: unknown;
}
```

# Operation ID to DTO kind (quick map)

| # | `OperationIds` member      | DTO `kind`                |
|---|----------------------------|---------------------------|
| 1 | `ConfigMerge`              | (K1)                      |
| 2 | `RuleAssembly`             | `assembled_rule_write`    |
| 3 | `TreeMaterialise`          | `file_tree_materialize`   |
| 4 | `MarkdownAggregate`        | `markdown_managed_block_patch` |
| 5 | `PlainMarkdownEmit`        | `plain_markdown_write`    |
| 6 | `TomlCommandGenerate`      | `toml_command_write`      |
| 7 | `HookJsonGraph`            | `hook_json_graph_merge`   |
| 8 | `SettingsNestedMerge`      | `settings_json_slice_merge` |
| 9 | `ExecutableInstall`        | `executable_materialize`  |
| 10 | `InterpolationValidate`   | `interpolation_policy`    |
| 11 | `DiscoveryHint`           | `discovery_hint_append`   |
| 12 | `ExperimentalDrop`        | `opaque_payload`          |

(K1) `json_document_merge` and `toml_document_merge` (same numeric id, different `kind`).

# Executor responsibilities (out of scope for DTO freeze)

- Resolve `relativeTargetPath` against `layerRoot` and create parent dirs.

- Read-modify-write with file locking or atomic rename where needed.

- Implement each `merge` mode consistently with agent docs.

- Record applied fragments in safehouse manifest for uninstall (separate DTO or
  manifest schema).

# Next step (step 3)

Prototype **merge** for `json_document_merge` on `.cursor/mcp.json` and
`settings_json_slice_merge` for `mcpServers`, using golden fixtures (see
file-operations plan step 3).
