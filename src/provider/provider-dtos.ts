/**
 * Provider plan DTOs (Feature 5 / internal DTO note).
 */

import type { InstallContext } from "../file-ops/install-context.js";
import type { PartKind } from "../file-ops/part-install-input.js";
import type {
  ConfigMergeOperationId,
  ExperimentalDropOperationId,
  HookJsonGraphOperationId,
  PlainMarkdownEmitOperationId,
  RuleAssemblyOperationId,
  TreeMaterialiseOperationId,
} from "../file-ops/operation-ids.js";

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
  /** Path relative to {@link InstallContext.layerRoot} (e.g. `rules/doc.md`). */
  relativeTargetPath: string;
  writeMode: "create_or_replace" | "create_only";
  content: string;
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
  /** Relative to {@link InstallContext.layerRoot} (e.g. `mcp.json` or `settings.json`). */
  relativeTargetPath: string;
  /** Parsed JSON root; must contain an `mcpServers` object (`mergeMcpJsonDocument`). */
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
  /** Destination relative to {@link InstallContext.layerRoot}. */
  relativeTargetPath: string;
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
}

/** Actions the Cursor provider executor can apply. */
export type ProviderAction =
  | PlainMarkdownWriteAction
  | McpJsonMergeAction
  | HooksJsonMergeAction
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
