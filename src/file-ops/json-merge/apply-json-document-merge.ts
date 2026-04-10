/**
 * Apply {@link mergeJsonDocumentWithStrategy} to a JSON file on disk.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { readJsonObjectFile } from "../read-json-object-file.js";
import { formatJsonDocument } from "../mcp-merge/mcp-json-helpers.js";
import {
  mergeJsonDocumentWithStrategy,
  type JsonMergeStrategy,
} from "./json-document-merge-strategies.js";

export type ApplyJsonDocumentStrategyStatus = "applied" | "noop" | "skipped";

export interface ApplyJsonDocumentStrategyMergeResult {
  status: ApplyJsonDocumentStrategyStatus;
  wrote: boolean;
}

export interface ApplyJsonDocumentStrategyOptions {
  /** When true, do not read or write the target file. */
  skipConfig?: boolean;
}

/**
 * Merge into `absolutePath` using a JSON strategy (see task 3.8).
 * Missing file is treated as `{}`. No-op leaves formatting unchanged.
 */
export async function applyJsonDocumentMergeWithStrategyToFile(
  absolutePath: string,
  payload: unknown,
  strategy: JsonMergeStrategy,
  options: ApplyJsonDocumentStrategyOptions = {}
): Promise<ApplyJsonDocumentStrategyMergeResult> {
  if (options.skipConfig) {
    return { status: "skipped", wrote: false };
  }

  const existing = await readJsonObjectFile(absolutePath);
  const { document, changed } = mergeJsonDocumentWithStrategy(existing, payload, strategy);

  if (!changed) {
    return { status: "noop", wrote: false };
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, formatJsonDocument(document), "utf8");
  return { status: "applied", wrote: true };
}
