/**
 * Read / write MCP merge results for JSON files on disk.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { McpMergeInvalidDocumentError } from "./errors.js";
import {
  mergeMcpJsonDocument,
  type McpMergeOptions,
  type McpMergeOutcomeStatus,
} from "./mcp-json-merge.js";

function formatJsonDocument(obj: unknown): string {
  return `${JSON.stringify(obj, null, 2)}\n`;
}

function parseJsonUtf8(raw: string, absolutePath: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    const err = e as SyntaxError;
    throw new McpMergeInvalidDocumentError(
      `Invalid JSON in ${absolutePath}: ${err.message}`
    );
  }
}

export interface ApplyMcpJsonMergeResult {
  status: McpMergeOutcomeStatus;
  /** True when the file was written. */
  wrote: boolean;
}

/**
 * Parse `absolutePath` as JSON if it exists; treat ENOENT as empty.
 * @throws McpMergeInvalidDocumentError on invalid JSON.
 */
export async function readJsonObjectFile(absolutePath: string): Promise<unknown | null> {
  let raw: string;
  try {
    raw = await fs.readFile(absolutePath, "utf8");
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return null;
    }
    throw e;
  }
  return parseJsonUtf8(raw, absolutePath);
}

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
  const outcome = mergeMcpJsonDocument(existing, incoming, options);

  if (outcome.status === "noop" || outcome.status === "skipped") {
    return { status: outcome.status, wrote: false };
  }

  const dir = path.dirname(absolutePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(absolutePath, formatJsonDocument(outcome.document), "utf8");
  return { status: "applied", wrote: true };
}
