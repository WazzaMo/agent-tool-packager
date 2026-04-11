/**
 * Shared I/O and simple file actions for {@link applyProviderPlan}.
 */

import fs from "node:fs";
import path from "node:path";

import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";
import type { McpMergeOptions } from "../file-ops/mcp-merge/mcp-json-merge.js";

import type { InstallContext } from "../file-ops/install-context.js";

import { applyManagedBlockToText } from "../file-ops/markdown-merge/managed-block-patch.js";

import { getOpaquePayloadHandler } from "./opaque-payload-handlers.js";

import type {
  DeleteManagedFileAction,
  DiscoveryHintAppendAction,
  MarkdownManagedBlockPatchAction,
  OpaquePayloadAction,
  PlainMarkdownWriteAction,
  RawFileCopyAction,
} from "./provider-dtos.js";
import type { ProviderMergeOptions } from "./types.js";

function resolveActionRoot(ctx: InstallContext, destinationRoot?: "layer" | "project"): string {
  return destinationRoot === "project" ? ctx.projectRoot : ctx.layerRoot;
}

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

export function applyMarkdownManagedBlockPatchAction(
  ctx: InstallContext,
  action: MarkdownManagedBlockPatchAction,
  onFileWritten?: (absolutePath: string) => void
): void {
  const root = resolveActionRoot(ctx, action.destinationRoot);
  const dest = path.join(root, action.relativeTargetPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const existing = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;
  const next = applyManagedBlockToText(
    existing,
    action.beginMarker,
    action.endMarker,
    action.body,
    action.ifMissing
  );
  if (next !== existing) {
    fs.writeFileSync(dest, next, action.encoding);
    onFileWritten?.(dest);
  }
}

export function applyPlainMarkdownWriteAction(
  ctx: InstallContext,
  action: PlainMarkdownWriteAction,
  onFileWritten?: (absolutePath: string) => void
): void {
  const root = resolveActionRoot(ctx, action.destinationRoot);
  const dest = path.join(root, action.relativeTargetPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (action.writeMode === "create_only" && fs.existsSync(dest)) {
    return;
  }
  fs.writeFileSync(dest, action.content, "utf8");
  onFileWritten?.(dest);
}

function copyDirectoryRecursive(
  srcDir: string,
  destDir: string,
  onFileWritten?: (absolutePath: string) => void
): void {
  fs.mkdirSync(destDir, { recursive: true });
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, ent.name);
    const d = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      copyDirectoryRecursive(s, d, onFileWritten);
    } else if (ent.isFile()) {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
      onFileWritten?.(d);
    }
  }
}

export function applyRawFileCopyAction(
  ctx: InstallContext,
  action: RawFileCopyAction,
  onFileWritten?: (absolutePath: string) => void
): void {
  const root = resolveActionRoot(ctx, action.destinationRoot);
  const dest = path.join(root, action.relativeTargetPath);
  if (!fs.existsSync(action.sourceAbsolutePath)) {
    return;
  }
  const st = fs.lstatSync(action.sourceAbsolutePath);
  if (st.isDirectory()) {
    if (!action.recursiveDirectorySource) {
      throw new Error(
        "raw_file_copy: source is a directory; set recursiveDirectorySource: true on the action."
      );
    }
    copyDirectoryRecursive(action.sourceAbsolutePath, dest, onFileWritten);
    return;
  }
  if (!st.isFile()) {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(action.sourceAbsolutePath, dest);
  onFileWritten?.(dest);
}

export function applyDeleteManagedFileAction(
  ctx: InstallContext,
  action: DeleteManagedFileAction,
  onFileWritten?: (absolutePath: string) => void
): void {
  const root = resolveActionRoot(ctx, action.destinationRoot);
  const dest = path.join(root, action.relativeTargetPath);
  if (fs.existsSync(dest) && fs.statSync(dest).isFile()) {
    fs.unlinkSync(dest);
    onFileWritten?.(dest);
  }
}

export function applyDiscoveryHintAppendAction(
  ctx: InstallContext,
  action: DiscoveryHintAppendAction,
  onFileWritten?: (absolutePath: string) => void
): void {
  const root = resolveActionRoot(ctx, action.destinationRoot);
  const dest = path.join(root, action.relativeTargetPath);
  const bullet = action.bulletMarkdownLine.trimEnd();
  if (!bullet) {
    return;
  }

  if (!fs.existsSync(dest)) {
    if (action.ifMissingFile === "skip") {
      return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, `# AGENTS.md\n\n${bullet}\n`, "utf8");
    onFileWritten?.(dest);
    return;
  }

  const existing = fs.readFileSync(dest, "utf8");
  if (existing.includes(bullet)) {
    return;
  }
  const suffix = existing.endsWith("\n") ? "" : "\n";
  const next = `${existing}${suffix}${bullet}\n`;
  fs.writeFileSync(dest, next, "utf8");
  onFileWritten?.(dest);
}

export function applyOpaquePayloadAction(
  ctx: InstallContext,
  action: OpaquePayloadAction,
  onFileWritten?: (absolutePath: string) => void
): void {
  const fn = getOpaquePayloadHandler(action.handlerId);
  fn(ctx, action.payload, onFileWritten);
}
