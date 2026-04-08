/**
 * Merge `mcpServers` into a JSON document (e.g. `.cursor/mcp.json`, `.mcp.json`,
 * or a full `settings.json`). Preserves unrelated top-level keys.
 *
 * Maps to file-operation ids 1 (whole-file MCP JSON) and 8 (`settings.json` slice).
 */

import { isDeepStrictEqual } from "node:util";

import { McpMergeAmbiguousError } from "./errors.js";
import {
  assertPlainObject,
  cloneJson,
  normalizeMcpServersPayload,
  readMcpServersObject,
} from "./mcp-json-helpers.js";

export interface McpMergeOptions {
  /** Overwrite an existing server entry when configuration differs. */
  forceConfig?: boolean;
  /** Do not read or write the file; return the existing document unchanged (or {}). */
  skipConfig?: boolean;
  /** Shown in {@link McpMergeAmbiguousError} (e.g. `.gemini/settings.json`). */
  mergeTargetLabel?: string;
}

export type McpMergeOutcomeStatus = "applied" | "noop" | "skipped";

export interface McpJsonMergeOutcome {
  status: McpMergeOutcomeStatus;
  document: Record<string, unknown>;
  /** True when any `mcpServers` entry was added or replaced. */
  mcpServersTouched: boolean;
}

/**
 * Merge incoming server definitions by name: add missing keys, no-op when equal,
 * or throw unless `forceConfig` replaces a conflicting entry.
 */
function mergeServerRecords(
  existingServers: Record<string, unknown>,
  incomingServers: Record<string, unknown>,
  options: McpMergeOptions
): { mergedServers: Record<string, unknown>; changed: boolean } {
  const out: Record<string, unknown> = { ...existingServers };
  let changed = false;

  for (const [name, incomingEntry] of Object.entries(incomingServers)) {
    if (!(name in existingServers)) {
      out[name] = cloneJson(incomingEntry);
      changed = true;
      continue;
    }

    const existingEntry = existingServers[name];
    if (isDeepStrictEqual(existingEntry, incomingEntry)) {
      continue;
    }

    if (options.forceConfig) {
      out[name] = cloneJson(incomingEntry);
      changed = true;
      continue;
    }

    throw new McpMergeAmbiguousError(
      name,
      existingEntry,
      incomingEntry,
      options.mergeTargetLabel ?? "the merged configuration file"
    );
  }

  return { mergedServers: out, changed };
}

function outcomeSkippedClone(existingDocument: unknown | null | undefined): McpJsonMergeOutcome {
  if (existingDocument === null || existingDocument === undefined) {
    return { status: "skipped", document: {}, mcpServersTouched: false };
  }
  const doc = assertPlainObject("existing document", existingDocument);
  return { status: "skipped", document: cloneJson(doc), mcpServersTouched: false };
}

/**
 * @param existingDocument - Parsed root object, or `null` / `undefined` if the file is missing.
 * @param incoming - Shape `{ mcpServers: Record<string, unknown> }`.
 * @returns Merged document and whether `mcpServers` changed.
 */
export function mergeMcpJsonDocument(
  existingDocument: unknown | null | undefined,
  incoming: unknown,
  options: McpMergeOptions = {}
): McpJsonMergeOutcome {
  if (options.skipConfig) {
    return outcomeSkippedClone(existingDocument);
  }

  const payload = normalizeMcpServersPayload(incoming);
  const existingRoot =
    existingDocument === null || existingDocument === undefined
      ? {}
      : assertPlainObject("existing document", existingDocument);

  const serversBefore = readMcpServersObject(existingRoot, "Existing document");
  const { mergedServers, changed } = mergeServerRecords(
    serversBefore,
    payload.mcpServers,
    options
  );

  const nextRoot: Record<string, unknown> = {
    ...existingRoot,
    mcpServers: mergedServers,
  };

  return {
    status: changed ? "applied" : "noop",
    document: nextRoot,
    mcpServersTouched: changed,
  };
}
