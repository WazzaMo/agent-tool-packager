/**
 * Read a UTF-8 JSON file as a parsed value (or null if missing).
 */

import fs from "node:fs/promises";

import { McpMergeInvalidDocumentError } from "./mcp-merge/errors.js";

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
