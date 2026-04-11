/**
 * Provider plan DTOs (Feature 5 / internal DTO note).
 */

import type { InstallContext } from "../file-ops/install-context.js";
import type { JsonMergeStrategy } from "../file-ops/json-merge/json-document-merge-strategies.js";
import type { PartKind } from "../file-ops/part-install-input.js";
import type {
  ConfigMergeOperationId,
  DiscoveryHintOperationId,
  ExperimentalDropOperationId,
  HookJsonGraphOperationId,
  InterpolationValidateOperationId,
  MarkdownAggregateOperationId,
  PlainMarkdownEmitOperationId,
  RuleAssemblyOperationId,
  TreeMaterialiseOperationId,
} from "../file-ops/operation-ids.js";
import type { ManagedBlockIfMissing } from "../file-ops/markdown-merge/managed-block-patch.js";

/**
 * Stable identity for merge keys and uninstall.
 *
 * Prefer `fragmentKey` as a path relative to {@link InstallContext.layerRoot} (e.g. `rules/doc.md`).
 */
export interface AtpProvenance {
  packageName: string;
  packageVersion?: string;
  partIndex?: number;
  partKind?: PartKind;
  fragmentKey: string;
}

/**
 * Write UTF-8 markdown under `layerRoot` (ops **5** PlainMarkdownEmit or **2** RuleAssembly).
 */
export interface PlainMarkdownWriteAction {
  kind: "plain_markdown_write";
  operationId: PlainMarkdownEmitOperationId | RuleAssemblyOperationId;
  provenance: AtpProvenance;
  /**
   * Path relative to {@link InstallContext.layerRoot} by default, or to
   * {@link InstallContext.projectRoot} when {@link destinationRoot} is `project` (e.g. Codex `.agents/skills/`).
   */
  relativeTargetPath: string;
  /** Default `layer` (agent directory such as `.codex/`). */
  destinationRoot?: "layer" | "project";
  writeMode: "create_or_replace" | "create_only";
  content: string;
  encoding: "utf-8";
}

/**
 * Insert or replace a bounded region in a layered instruction file (op **4** MarkdownAggregate),
 * e.g. project-root `GEMINI.md`, `CLAUDE.md`, or `AGENTS.md`.
 */
export interface MarkdownManagedBlockPatchAction {
  kind: "markdown_managed_block_patch";
  operationId: MarkdownAggregateOperationId;
  provenance: AtpProvenance;
  /** Relative to {@link InstallContext.projectRoot} when {@link destinationRoot} is `project`. */
  relativeTargetPath: string;
  /** Default `project` for aggregate files at repo root. */
  destinationRoot?: "layer" | "project";
  beginMarker: string;
  endMarker: string;
  body: string;
  ifMissing: ManagedBlockIfMissing;
  encoding: "utf-8";
}

/**
 * Merge MCP server definitions into agent JSON (op **1** ConfigMerge), e.g. `mcp.json` or
 * Gemini `settings.json`.
 */
export interface McpJsonMergeAction {
  kind: "mcp_json_merge";
  operationId: ConfigMergeOperationId;
  provenance: AtpProvenance;
  /**
   * When `layer` (default), path is under {@link InstallContext.layerRoot}.
   * When `project`, path is under {@link InstallContext.projectRoot} (Claude project `.mcp.json`).
   * When `user_home`, path is under the process home directory (Claude user `~/.claude.json`).
   */
  mergeBase?: "layer" | "project" | "user_home";
  /** Relative to merge base per {@link McpJsonMergeAction.mergeBase}. */
  relativeTargetPath: string;
  /** Parsed JSON root; must contain an `mcpServers` object (`mergeMcpJsonDocument`). */
  payload: unknown;
}

/**
 * Merge arbitrary JSON using {@link JsonMergeStrategy} (task 3.8), e.g. `deep_assign_paths` or
 * `replace_at_pointer`. Does **not** apply MCP server-name ambiguity rules; use {@link McpJsonMergeAction}
 * for standard `{ mcpServers: { … } }` catalog payloads.
 */
export interface JsonDocumentStrategyMergeAction {
  kind: "json_document_strategy_merge";
  operationId: ConfigMergeOperationId;
  provenance: AtpProvenance;
  mergeBase?: "layer" | "project" | "user_home";
  relativeTargetPath: string;
  strategy: JsonMergeStrategy;
  payload: unknown;
}

/**
 * Merge packaged MCP JSON (`mcpServers`) into Codex **`config.toml`** `[mcp_servers]` tables (op **1** ConfigMerge).
 */
export interface McpCodexConfigTomlMergeAction {
  kind: "mcp_codex_config_toml_merge";
  operationId: ConfigMergeOperationId;
  provenance: AtpProvenance;
  /** Relative to {@link InstallContext.layerRoot} (typically `config.toml`). */
  relativeTargetPath: string;
  payload: unknown;
}

/**
 * Merge hook handlers into agent JSON (op **7** HookJsonGraph), e.g. `hooks.json` or Gemini
 * `settings.json`.
 */
export interface HooksJsonMergeAction {
  kind: "hooks_json_merge";
  operationId: HookJsonGraphOperationId;
  provenance: AtpProvenance;
  /** Relative to {@link InstallContext.layerRoot} (e.g. `hooks.json` or `settings.json`). */
  relativeTargetPath: string;
  payload: unknown;
}

/**
 * Copy a staged binary or script into the agent tree (op **3** TreeMaterialise).
 */
export interface RawFileCopyAction {
  kind: "raw_file_copy";
  operationId: TreeMaterialiseOperationId;
  provenance: AtpProvenance;
  /** Destination relative to layer or project root per {@link destinationRoot}. */
  relativeTargetPath: string;
  /** Default `layer`. */
  destinationRoot?: "layer" | "project";
  /** Absolute path to the staged source file. */
  sourceAbsolutePath: string;
}

/**
 * Remove a single file under `layerRoot` owned by the provider plan (uninstall).
 */
export interface DeleteManagedFileAction {
  kind: "delete_managed_file";
  operationId: ExperimentalDropOperationId;
  provenance: AtpProvenance;
  relativeTargetPath: string;
  /** Default `layer`. */
  destinationRoot?: "layer" | "project";
}

/** Validate or normalise `${…}` placeholders in a JSON config file after merge (op **10**). */
export interface InterpolationPolicyAction {
  kind: "interpolation_policy";
  operationId: InterpolationValidateOperationId;
  provenance: AtpProvenance;
  /** Same roots as {@link McpJsonMergeAction.mergeBase}; hooks always use default `layer`. */
  mergeBase?: "layer" | "project" | "user_home";
  relativeTargetPath: string;
  policy: "validate_only" | "normalize_workspace_paths";
}

/** Append one markdown bullet line to an index file (op **11**). */
export interface DiscoveryHintAppendAction {
  kind: "discovery_hint_append";
  operationId: DiscoveryHintOperationId;
  provenance: AtpProvenance;
  relativeTargetPath: string;
  destinationRoot?: "layer" | "project";
  bulletMarkdownLine: string;
  ifMissingFile: "skip" | "create_minimal";
}

/** Registry-driven install for Experimental parts (op **12**). */
export interface OpaquePayloadAction {
  kind: "opaque_payload";
  operationId: ExperimentalDropOperationId;
  provenance: AtpProvenance;
  handlerId: string;
  payload: unknown;
}

/** Actions the Cursor provider executor can apply. */
export type ProviderAction =
  | PlainMarkdownWriteAction
  | MarkdownManagedBlockPatchAction
  | McpJsonMergeAction
  | JsonDocumentStrategyMergeAction
  | McpCodexConfigTomlMergeAction
  | HooksJsonMergeAction
  | InterpolationPolicyAction
  | DiscoveryHintAppendAction
  | OpaquePayloadAction
  | RawFileCopyAction
  | DeleteManagedFileAction;

/**
 * Ordered side effects for one provider run (one part × agent × layer).
 */
export interface ProviderPlan {
  context: InstallContext;
  provenanceBase: Pick<AtpProvenance, "packageName" | "packageVersion" | "partIndex" | "partKind">;
  actions: ProviderAction[];
}
