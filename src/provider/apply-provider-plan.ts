/**
 * Execute {@link ProviderPlan.actions} in order against `plan.context.layerRoot`.
 */

import fs from "node:fs";
import path from "node:path";

import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";
import { canonicalJsonStringify, sha256HexCanonicalJson } from "../config/canonical-json.js";
import {
  extractHooksDeltaFromPayload,
  mergeHooksJsonDocument,
} from "../file-ops/hooks-merge/cursor-hooks-json-merge.js";
import { formatJsonDocument, normalizeMcpServersPayload } from "../file-ops/mcp-merge/mcp-json-helpers.js";
import { mergeMcpJsonDocument, type McpMergeOptions } from "../file-ops/mcp-merge/mcp-json-merge.js";

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

function mcpServerNamesFromPayload(payload: unknown): string[] {
  try {
    return Object.keys(normalizeMcpServersPayload(payload).mcpServers);
  } catch {
    return [];
  }
}

function pushJournal(
  journal: ConfigMergeJournalEntryV1[] | undefined,
  entry: ConfigMergeJournalEntryV1
): void {
  journal?.push(entry);
}

/**
 * Materialise filesystem effects for a provider plan.
 *
 * @param plan - Provider plan with absolute `context.layerRoot`.
 * @param merge - MCP / hooks merge policy.
 * @param onFileWritten - Optional hook per file created, overwritten, or removed.
 * @param configMergeJournal - When set, append one entry per applied MCP/hooks merge (Safehouse rollback).
 */
export function applyProviderPlan(
  plan: ProviderPlan,
  merge: ProviderMergeOptions,
  onFileWritten?: (absolutePath: string) => void,
  configMergeJournal?: ConfigMergeJournalEntryV1[]
): void {
  const root = plan.context.layerRoot;
  const mcpOpts = mcpMergeOptionsFromProvider(merge);
  const hooksOpts = { forceConfig: merge.forceConfig, skipConfig: merge.skipConfig };

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
      const beforeAbsent = !fs.existsSync(dest);
      const existing = readJsonIfExists(dest);
      const beforeObj =
        existing === null || existing === undefined
          ? {}
          : (existing as Record<string, unknown>);
      const beforeCanonical = canonicalJsonStringify(beforeObj);
      const beforeSha = sha256HexCanonicalJson(beforeObj);

      const outcome = mergeMcpJsonDocument(existing, action.payload, mcpOpts);
      if (outcome.status === "applied") {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, formatJsonDocument(outcome.document), "utf8");
        onFileWritten?.(dest);
        const afterSha = sha256HexCanonicalJson(outcome.document);
        pushJournal(configMergeJournal, {
          agent_relative_path: action.relativeTargetPath.replace(/\\/g, "/"),
          kind: "mcp",
          before_absent: beforeAbsent,
          before_sha256: beforeSha,
          after_sha256: afterSha,
          fragments: {
            type: "mcp",
            server_names: mcpServerNamesFromPayload(action.payload),
          },
          before_canonical: beforeCanonical,
        });
      }
      continue;
    }

    if (action.kind === "hooks_json_merge") {
      const dest = path.join(root, action.relativeTargetPath);
      const beforeAbsent = !fs.existsSync(dest);
      const existing = readJsonIfExists(dest);
      const beforeObj =
        existing === null || existing === undefined
          ? {}
          : (existing as Record<string, unknown>);
      const beforeCanonical = canonicalJsonStringify(beforeObj);
      const beforeSha = sha256HexCanonicalJson(beforeObj);

      const { document, changed } = mergeHooksJsonDocument(existing, action.payload, hooksOpts);
      if (changed) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, formatJsonDocument(document), "utf8");
        onFileWritten?.(dest);
        const afterSha = sha256HexCanonicalJson(document);
        const hooksDelta = extractHooksDeltaFromPayload(action.payload);
        pushJournal(configMergeJournal, {
          agent_relative_path: action.relativeTargetPath.replace(/\\/g, "/"),
          kind: "hooks",
          before_absent: beforeAbsent,
          before_sha256: beforeSha,
          after_sha256: afterSha,
          fragments: { type: "hooks", hooks_delta: hooksDelta },
          before_canonical: beforeCanonical,
        });
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
