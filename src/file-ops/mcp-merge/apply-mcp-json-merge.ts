/**
 * Read / write MCP merge results for JSON files on disk.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { readJsonObjectFile } from "../read-json-object-file.js";
import { mergeConfigTargetLabel } from "../merge-config-target-label.js";
import {
  mergeMcpJsonDocument,
  type McpMergeOptions,
  type McpMergeOutcomeStatus,
} from "./mcp-json-merge.js";
import { formatJsonDocument } from "./mcp-json-helpers.js";

export interface ApplyMcpJsonMergeResult {
  status: McpMergeOutcomeStatus;
  /** True when the file was written. */
  wrote: boolean;
}

export { readJsonObjectFile } from "../read-json-object-file.js";

/**
 * Merge `incoming` into the JSON file at `absolutePath` (MCP-style `mcpServers` map).
 *
 * - Missing file: creates parent directories and writes the merged document.
 * - `skipConfig`: does not read or write the file (returns `skipped`, `wrote: false`).
 * - `noop`: file is left unchanged (including formatting).
 */
export async function applyMcpJsonMergeToFile(
  absolutePath: string,
  incoming: unknown,
  options: McpMergeOptions = {}
): Promise<ApplyMcpJsonMergeResult> {
  if (options.skipConfig) {
    return { status: "skipped", wrote: false };
  }

  const existing = await readJsonObjectFile(absolutePath);
  const dir = path.dirname(absolutePath);
  const mergeOpts: McpMergeOptions = {
    ...options,
    mergeTargetLabel:
      options.mergeTargetLabel ??
      mergeConfigTargetLabel(dir, path.basename(absolutePath)),
  };
  const outcome = mergeMcpJsonDocument(existing, incoming, mergeOpts);

  if (outcome.status === "noop" || outcome.status === "skipped") {
    return { status: outcome.status, wrote: false };
  }

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(absolutePath, formatJsonDocument(outcome.document), "utf8");
  return { status: "applied", wrote: true };
}
