/**
 * Human-facing lines for install failures (merge ambiguity hint + optional `--verbose` JSON).
 */

import { HooksMergeAmbiguousError } from "../file-ops/hooks-merge/errors.js";
import {
  CodexHooksFeatureConflictError,
  McpMergeAmbiguousError,
} from "../file-ops/mcp-merge/errors.js";

/** Shown once after MCP / hooks merge ambiguity messages (not duplicated on the Error subclass). */
export const MERGE_CONFIG_AMBIGUITY_HINT =
  "Hint: Packages only add or replace entries they own; other keys in the file are preserved.";

/**
 * @param err - Thrown value from install (often an `Error`).
 * @param verbose - When true, include a JSON line with stable fields for MCP / hooks ambiguity errors.
 * @returns Lines to print to stderr, in order.
 */
export function formatInstallUserFailureLines(err: unknown, verbose: boolean): string[] {
  if (err instanceof McpMergeAmbiguousError) {
    const lines = [err.message];
    if (verbose) {
      lines.push(
        JSON.stringify({
          code: err.code,
          serverName: err.serverName,
          mergeTargetLabel: err.mergeTargetLabel,
        })
      );
    }
    lines.push(MERGE_CONFIG_AMBIGUITY_HINT);
    return lines;
  }
  if (err instanceof CodexHooksFeatureConflictError) {
    const lines = [err.message];
    if (verbose) {
      lines.push(
        JSON.stringify({
          code: err.code,
          mergeTargetLabel: err.mergeTargetLabel,
        })
      );
    }
    lines.push(MERGE_CONFIG_AMBIGUITY_HINT);
    return lines;
  }
  if (err instanceof HooksMergeAmbiguousError) {
    const lines = [err.message];
    if (verbose) {
      lines.push(
        JSON.stringify({
          code: err.code,
          eventName: err.eventName,
          dedupeKey: err.dedupeKey,
          mergeTargetLabel: err.mergeTargetLabel,
        })
      );
    }
    lines.push(MERGE_CONFIG_AMBIGUITY_HINT);
    return lines;
  }
  return [String(err)];
}

/**
 * Whether install should emit merge-debug JSON (matches `DEBUG=atp` alongside other tokens).
 */
export function mergeAmbiguityVerboseRequested(verboseFlag: boolean): boolean {
  if (verboseFlag) {
    return true;
  }
  const raw = process.env.DEBUG;
  if (raw === undefined || raw === "") {
    return false;
  }
  return raw.split(/[\s,]+/).some((t) => t === "atp");
}
