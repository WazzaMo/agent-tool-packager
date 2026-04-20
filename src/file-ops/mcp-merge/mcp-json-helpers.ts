/**
 * JSON shape validation and cloning for MCP config documents.
 */

import {
  McpMergeInvalidDocumentError,
  McpMergeInvalidPayloadError,
} from "./errors.js";

/** Deep clone JSON-serialisable values (MCP entries must be plain data). */
export function cloneJson<T>(v: T): T {
  return structuredClone(v);
}

/**
 * Pretty-print a JSON document for config files (trailing newline).
 *
 * @param obj - Root object to serialise.
 * @returns UTF-8 text with two-space indent.
 */
export function formatJsonDocument(obj: unknown): string {
  return `${JSON.stringify(obj, null, 2)}\n`;
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * @param label - Shown in error messages (e.g. `"existing document"`).
 */
export function assertPlainObject(label: string, v: unknown): Record<string, unknown> {
  if (!isPlainObject(v)) {
    throw new McpMergeInvalidDocumentError(`Expected ${label} to be a plain JSON object.`);
  }
  return v;
}

/**
 * Read the `mcpServers` map from a document root, defaulting to `{}` when absent.
 */
export function readMcpServersObject(
  document: Record<string, unknown>,
  label: string
): Record<string, unknown> {
  if (!("mcpServers" in document)) {
    return {};
  }
  const m = document.mcpServers;
  if (m === undefined) {
    return {};
  }
  if (!isPlainObject(m)) {
    throw new McpMergeInvalidDocumentError(
      `${label}: "mcpServers" must be a plain object when present.`
    );
  }
  return m;
}

/**
 * Validate install payload shape: root object with plain-object `mcpServers`.
 */
export function normalizeMcpServersPayload(
  incoming: unknown
): { mcpServers: Record<string, unknown> } {
  const doc = assertPlainObject("payload", incoming);
  if (!("mcpServers" in doc)) {
    throw new McpMergeInvalidPayloadError('Payload must include an "mcpServers" object.');
  }
  const m = doc.mcpServers;
  if (!isPlainObject(m)) {
    throw new McpMergeInvalidPayloadError('"mcpServers" must be a plain object.');
  }
  return { mcpServers: m };
}
