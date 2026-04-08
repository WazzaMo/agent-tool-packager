/**
 * Shared I/O and simple file actions for {@link applyProviderPlan}.
 */

import fs from "node:fs";
import path from "node:path";

import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";
import type { McpMergeOptions } from "../file-ops/mcp-merge/mcp-json-merge.js";

import type {
  DeleteManagedFileAction,
  PlainMarkdownWriteAction,
  RawFileCopyAction,
} from "./provider-dtos.js";
import type { ProviderMergeOptions } from "./types.js";

export function readJsonIfExists(absolutePath: string): unknown | null {
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  const raw = fs.readFileSync(absolutePath, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    const err = e as SyntaxError;
    throw new Error(`Invalid JSON in ${absolutePath}: ${err.message}`);
  }
}

export function mcpMergeOptionsFromProvider(
  merge: ProviderMergeOptions,
  mergeTargetLabel: string
): McpMergeOptions {
  return {
    forceConfig: merge.forceConfig,
    skipConfig: merge.skipConfig,
    mergeTargetLabel,
  };
}

export function pushJournal(
  journal: ConfigMergeJournalEntryV1[] | undefined,
  entry: ConfigMergeJournalEntryV1
): void {
  journal?.push(entry);
}

export function applyPlainMarkdownWriteAction(
  root: string,
  action: PlainMarkdownWriteAction,
  onFileWritten?: (absolutePath: string) => void
): void {
  const dest = path.join(root, action.relativeTargetPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (action.writeMode === "create_only" && fs.existsSync(dest)) {
    return;
  }
  fs.writeFileSync(dest, action.content, "utf8");
  onFileWritten?.(dest);
}

export function applyRawFileCopyAction(
  root: string,
  action: RawFileCopyAction,
  onFileWritten?: (absolutePath: string) => void
): void {
  const dest = path.join(root, action.relativeTargetPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(action.sourceAbsolutePath, dest);
  onFileWritten?.(dest);
}

export function applyDeleteManagedFileAction(
  root: string,
  action: DeleteManagedFileAction,
  onFileWritten?: (absolutePath: string) => void
): void {
  const dest = path.join(root, action.relativeTargetPath);
  if (fs.existsSync(dest) && fs.statSync(dest).isFile()) {
    fs.unlinkSync(dest);
    onFileWritten?.(dest);
  }
}
