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

  readonly existingEntry: unknown;

  readonly incomingEntry: unknown;

  constructor(
    serverName: string,
    existingEntry: unknown,
    incomingEntry: unknown,
    mergeTargetLabel = "the merged configuration file"
  ) {
    super(
      `MCP server "${serverName}" already exists with different configuration; ` +
        `use --force-config to overwrite or --skip-config to leave ${mergeTargetLabel} unchanged.`
    );
    this.name = "McpMergeAmbiguousError";
    this.serverName = serverName;
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
