/**
 * Remove ATP-owned MCP server entries from a merged JSON document (safe uninstall).
 */

import { assertPlainObject, readMcpServersObject } from "./mcp-json-helpers.js";

/**
 * Drop named keys from `mcpServers`, preserving all other top-level keys.
 *
 * @param existingDocument - Parsed root object, or null / undefined if the file is missing.
 * @param serverNames - Keys to remove (typically from the package MCP asset payload).
 */
export function removeMcpServersByNamesFromDocument(
  existingDocument: unknown | null | undefined,
  serverNames: readonly string[]
): { document: Record<string, unknown>; changed: boolean } {
  if (existingDocument === null || existingDocument === undefined) {
    return { document: {}, changed: false };
  }

  const root = assertPlainObject("existing document", existingDocument);
  const servers = { ...readMcpServersObject(root, "Existing document") };
  let changed = false;

  for (const name of serverNames) {
    if (name in servers) {
      delete servers[name];
      changed = true;
    }
  }

  return {
    document: { ...root, mcpServers: servers },
    changed,
  };
}
