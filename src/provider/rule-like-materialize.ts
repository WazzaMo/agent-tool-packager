/**
 * Normalise rule-like markdown for agent installs (Cursor, Claude, Gemini, skills): plain `.md`
 * passthrough; splittable `.mdc` (YAML between `---` lines) assembled via {@link assembleCursorMdcContent}.
 */

import {
  OperationIds,
  type PlainMarkdownEmitOperationId,
  type RuleAssemblyOperationId,
} from "../file-ops/operation-ids.js";
import { assembleCursorMdcContent } from "../file-ops/rule-assembly/cursor-mdc.js";

const CURSOR_MDC_SPLIT =
  /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/;

/**
 * When `raw` is a Cursor-style `.mdc` (YAML block between `---` lines), returns the pieces.
 *
 * @param raw - File UTF-8 contents.
 * @returns Parts for {@link assembleCursorMdcContent}, or undefined when not in that shape.
 */
export function trySplitCursorMdcSource(raw: string): { yaml: string; body: string } | undefined {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const m = normalized.match(CURSOR_MDC_SPLIT);
  if (!m) {
    return undefined;
  }
  return { yaml: m[1].trimEnd(), body: m[2] };
}

export interface RuleLikeMaterializeResult {
  content: string;
  operationId: PlainMarkdownEmitOperationId | RuleAssemblyOperationId;
}

/**
 * Prepare rule-like file text for writing: `.md` unchanged; `.mdc` assembled when splittable.
 *
 * @param fileName - Basename or path (extension drives `.mdc` handling).
 * @param raw - Staged UTF-8 file body (placeholders already patched).
 * @returns Text to write and the tracing operation id.
 */
export function materializeRuleLike(fileName: string, raw: string): RuleLikeMaterializeResult {
  const lower = fileName.toLowerCase();
  if (!lower.endsWith(".mdc")) {
    return { content: raw, operationId: OperationIds.PlainMarkdownEmit };
  }
  const split = trySplitCursorMdcSource(raw);
  if (!split) {
    return { content: raw, operationId: OperationIds.PlainMarkdownEmit };
  }
  return {
    content: assembleCursorMdcContent(split.yaml, split.body),
    operationId: OperationIds.RuleAssembly,
  };
}
