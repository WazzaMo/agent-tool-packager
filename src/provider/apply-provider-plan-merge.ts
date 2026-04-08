/**
 * MCP and hooks JSON merge actions for {@link applyProviderPlan}.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";
import { canonicalJsonStringify, sha256HexCanonicalJson } from "../config/canonical-json.js";
import {
  extractHooksDeltaFromPayload,
  mergeHooksJsonDocument,
} from "../file-ops/hooks-merge/cursor-hooks-json-merge.js";
import { mergeConfigTargetLabel } from "../file-ops/merge-config-target-label.js";
import { formatJsonDocument, normalizeMcpServersPayload } from "../file-ops/mcp-merge/mcp-json-helpers.js";
import { mergeMcpJsonDocument } from "../file-ops/mcp-merge/mcp-json-merge.js";

import {
  mcpMergeOptionsFromProvider,
  pushJournal,
  readJsonIfExists,
} from "./apply-provider-plan-base.js";

import type {
  HooksJsonMergeAction,
  McpJsonMergeAction,
  ProviderPlan,
} from "./provider-dtos.js";
import type { ProviderMergeOptions } from "./types.js";

function mcpServerNamesFromPayload(payload: unknown): string[] {
  try {
    return Object.keys(normalizeMcpServersPayload(payload).mcpServers);
  } catch {
    return [];
  }
}

function mcpMergeBaseRoot(plan: ProviderPlan, action: McpJsonMergeAction): string {
  const mergeBase = action.mergeBase ?? "layer";
  if (mergeBase === "project") {
    return plan.context.projectRoot;
  }
  if (mergeBase === "user_home") {
    return os.homedir();
  }
  return plan.context.layerRoot;
}

function mcpMergeLabelForAction(plan: ProviderPlan, action: McpJsonMergeAction): string {
  const mergeBase = action.mergeBase ?? "layer";
  if (mergeBase === "project") {
    return ".mcp.json";
  }
  if (mergeBase === "user_home") {
    return "~/.claude.json";
  }
  return mergeConfigTargetLabel(plan.context.layerRoot, action.relativeTargetPath);
}

function journalConfigRootForMcp(
  action: McpJsonMergeAction
): Pick<ConfigMergeJournalEntryV1, "configRoot"> | Record<string, never> {
  const mergeBase = action.mergeBase ?? "layer";
  if (mergeBase === "project") {
    return { configRoot: "project" };
  }
  if (mergeBase === "user_home") {
    return { configRoot: "user_home" };
  }
  return {};
}

export function applyMcpJsonMergeAction(
  plan: ProviderPlan,
  action: McpJsonMergeAction,
  merge: ProviderMergeOptions,
  onFileWritten?: (absolutePath: string) => void,
  configMergeJournal?: ConfigMergeJournalEntryV1[]
): void {
  const rel = action.relativeTargetPath.replace(/\\/g, "/");
  if (rel.includes("..") || path.posix.isAbsolute(rel)) {
    throw new Error(`Invalid mcp_json_merge path "${action.relativeTargetPath}" (no .. or absolute segments).`);
  }
  const baseRoot = mcpMergeBaseRoot(plan, action);
  const dest = path.join(baseRoot, rel);
  const beforeAbsent = !fs.existsSync(dest);
  const existing = readJsonIfExists(dest);
  const beforeObj =
    existing === null || existing === undefined ? {} : (existing as Record<string, unknown>);
  const beforeCanonical = canonicalJsonStringify(beforeObj);
  const beforeSha = sha256HexCanonicalJson(beforeObj);

  const mergeLabel = mcpMergeLabelForAction(plan, action);
  const outcome = mergeMcpJsonDocument(
    existing,
    action.payload,
    mcpMergeOptionsFromProvider(merge, mergeLabel)
  );
  if (outcome.status !== "applied") {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, formatJsonDocument(outcome.document), "utf8");
  onFileWritten?.(dest);
  const afterSha = sha256HexCanonicalJson(outcome.document);
  pushJournal(configMergeJournal, {
    agent_relative_path: rel,
    ...journalConfigRootForMcp(action),
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

export function applyHooksJsonMergeAction(
  plan: ProviderPlan,
  action: HooksJsonMergeAction,
  merge: ProviderMergeOptions,
  onFileWritten?: (absolutePath: string) => void,
  configMergeJournal?: ConfigMergeJournalEntryV1[]
): void {
  const root = plan.context.layerRoot;
  const dest = path.join(root, action.relativeTargetPath);
  const beforeAbsent = !fs.existsSync(dest);
  const existing = readJsonIfExists(dest);
  const beforeObj =
    existing === null || existing === undefined ? {} : (existing as Record<string, unknown>);
  const beforeCanonical = canonicalJsonStringify(beforeObj);
  const beforeSha = sha256HexCanonicalJson(beforeObj);

  const mergeLabel = mergeConfigTargetLabel(root, action.relativeTargetPath);
  const { document, changed } = mergeHooksJsonDocument(existing, action.payload, {
    forceConfig: merge.forceConfig,
    skipConfig: merge.skipConfig,
    mergeTargetLabel: mergeLabel,
  });
  if (!changed) {
    return;
  }
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
