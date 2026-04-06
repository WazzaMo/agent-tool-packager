/**
 * Execute {@link ProviderPlan.actions} in order against `plan.context.layerRoot`.
 */

import fs from "node:fs";
import path from "node:path";

import { formatJsonDocument } from "../file-ops/mcp-merge/mcp-json-helpers.js";
import { mergeMcpJsonDocument, type McpMergeOptions } from "../file-ops/mcp-merge/mcp-json-merge.js";
import { mergeHooksJsonDocument } from "../file-ops/hooks-merge/cursor-hooks-json-merge.js";

import type { ProviderPlan } from "./provider-dtos.js";
import type { ProviderMergeOptions } from "./types.js";

function readJsonIfExists(absolutePath: string): unknown | null {
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

function mcpMergeOptionsFromProvider(merge: ProviderMergeOptions): McpMergeOptions {
  return {
    forceConfig: merge.forceConfig,
    skipConfig: merge.skipConfig,
  };
}

/**
 * Materialise filesystem effects for a provider plan.
 *
 * @param plan - Provider plan with absolute `context.layerRoot`.
 * @param merge - MCP / hooks merge policy.
 * @param onFileWritten - Optional hook per file created, overwritten, or removed.
 */
export function applyProviderPlan(
  plan: ProviderPlan,
  merge: ProviderMergeOptions,
  onFileWritten?: (absolutePath: string) => void
): void {
  const root = plan.context.layerRoot;
  const mcpOpts = mcpMergeOptionsFromProvider(merge);
  const hooksOpts = { skipConfig: merge.skipConfig };

  for (const action of plan.actions) {
    if (action.kind === "plain_markdown_write") {
      const dest = path.join(root, action.relativeTargetPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (action.writeMode === "create_only" && fs.existsSync(dest)) {
        continue;
      }
      fs.writeFileSync(dest, action.content, "utf8");
      onFileWritten?.(dest);
      continue;
    }

    if (action.kind === "mcp_json_merge") {
      const dest = path.join(root, action.relativeTargetPath);
      const existing = readJsonIfExists(dest);
      const outcome = mergeMcpJsonDocument(existing, action.payload, mcpOpts);
      if (outcome.status === "applied") {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, formatJsonDocument(outcome.document), "utf8");
        onFileWritten?.(dest);
      }
      continue;
    }

    if (action.kind === "hooks_json_merge") {
      const dest = path.join(root, action.relativeTargetPath);
      const existing = readJsonIfExists(dest);
      const { document, changed } = mergeHooksJsonDocument(existing, action.payload, hooksOpts);
      if (changed) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, formatJsonDocument(document), "utf8");
        onFileWritten?.(dest);
      }
      continue;
    }

    if (action.kind === "raw_file_copy") {
      const dest = path.join(root, action.relativeTargetPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(action.sourceAbsolutePath, dest);
      onFileWritten?.(dest);
      continue;
    }

    if (action.kind === "delete_managed_file") {
      const dest = path.join(root, action.relativeTargetPath);
      if (fs.existsSync(dest) && fs.statSync(dest).isFile()) {
        fs.unlinkSync(dest);
        onFileWritten?.(dest);
      }
    }
  }
}
