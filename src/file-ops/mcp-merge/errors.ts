/**
 * Merge failures for MCP JSON documents and settings.json slices.
 */

/**
 * Same MCP server name is already present with different configuration.
 * Callers should prompt for `--force-config` or `--skip-config` (see capability-matrix note).
 */
export class McpMergeAmbiguousError extends Error {
  readonly code = "MCP_MERGE_AMBIGUOUS" as const;

  readonly serverName: string;

  /** Human-readable target (e.g. `.cursor/mcp.json`); used in {@link McpMergeAmbiguousError.message} and CLI `--verbose`. */
  readonly mergeTargetLabel: string;

  readonly existingEntry: unknown;

  readonly incomingEntry: unknown;

  constructor(
    serverName: string,
    existingEntry: unknown,
    incomingEntry: unknown,
    mergeTargetLabel = "the merged configuration file"
  ) {
    const label = mergeTargetLabel;
    super(
      `MCP server "${serverName}" conflicts with existing entry in ${label}; ` +
        `use --force-config to replace it or --skip-config to skip this merge.`
    );
    this.name = "McpMergeAmbiguousError";
    this.serverName = serverName;
    this.mergeTargetLabel = label;
    this.existingEntry = existingEntry;
    this.incomingEntry = incomingEntry;
  }
}

/** Existing file content is not valid JSON or not the expected object shape. */
export class McpMergeInvalidDocumentError extends Error {
  readonly code = "MCP_MERGE_INVALID_DOCUMENT" as const;

  constructor(message: string) {
    super(message);
    this.name = "McpMergeInvalidDocumentError";
  }
}

/** Install payload is missing `mcpServers` or it is not a plain object. */
export class McpMergeInvalidPayloadError extends Error {
  readonly code = "MCP_MERGE_INVALID_PAYLOAD" as const;

  constructor(message: string) {
    super(message);
    this.name = "McpMergeInvalidPayloadError";
  }
}

/**
 * Codex `config.toml` has `[features] codex_hooks = false` but a Hook package needs hooks enabled.
 * Use `--force-config` to set `codex_hooks = true`, or enable it manually before installing.
 */
export class CodexHooksFeatureConflictError extends Error {
  readonly code = "CODEX_HOOKS_FEATURE_CONFLICT" as const;

  readonly mergeTargetLabel: string;

  constructor(mergeTargetLabel: string) {
    const label = mergeTargetLabel;
    super(
      `${label}: [features] codex_hooks is false; installing Codex hooks requires enabling it. ` +
        `Set codex_hooks = true manually, or use --force-config to let ATP enable it (see docs).`
    );
    this.name = "CodexHooksFeatureConflictError";
    this.mergeTargetLabel = label;
  }
}
