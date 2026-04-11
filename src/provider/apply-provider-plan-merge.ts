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
} from "../file-ops/hooks-merge/hooks-json-merge.js";
import { mergeConfigTargetLabel } from "../file-ops/merge-config-target-label.js";
import { formatJsonDocument, normalizeMcpServersPayload } from "../file-ops/mcp-merge/mcp-json-helpers.js";
import {
  mergeCodexConfigTomlMcp,
  parseCodexConfigTomlRoot,
} from "../file-ops/mcp-merge/mcp-codex-toml-merge.js";
import { mergeMcpJsonDocument } from "../file-ops/mcp-merge/mcp-json-merge.js";
import { mergeJsonDocumentWithStrategy } from "../file-ops/json-merge/json-document-merge-strategies.js";
import {
  collectInterpolationIssuesInJson,
  normalizeWorkspaceVariablesInJson,
} from "../file-ops/interpolation/config-interpolation.js";

import {
  mcpMergeOptionsFromProvider,
  pushJournal,
  readJsonIfExists,
} from "./apply-provider-plan-base.js";

import type {
  HooksJsonMergeAction,
  InterpolationPolicyAction,
  JsonDocumentStrategyMergeAction,
  McpCodexConfigTomlMergeAction,
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

function mcpMergeBaseRoot(plan: ProviderPlan, mergeBase: McpJsonMergeAction["mergeBase"]): string {
  const b = mergeBase ?? "layer";
  if (b === "project") {
    return plan.context.projectRoot;
  }
  if (b === "user_home") {
    return os.homedir();
  }
  return plan.context.layerRoot;
}

function mcpMergeLabelForAction(
  plan: ProviderPlan,
  mergeBase: McpJsonMergeAction["mergeBase"],
  relativeTargetPath: string
): string {
  const b = mergeBase ?? "layer";
  if (b === "project") {
    return ".mcp.json";
  }
  if (b === "user_home") {
    return "~/.claude.json";
  }
  return mergeConfigTargetLabel(plan.context.layerRoot, relativeTargetPath);
}

function journalConfigRootForJsonMerge(
  mergeBase: McpJsonMergeAction["mergeBase"]
): Pick<ConfigMergeJournalEntryV1, "configRoot"> | Record<string, never> {
  const b = mergeBase ?? "layer";
  if (b === "project") {
    return { configRoot: "project" };
  }
  if (b === "user_home") {
    return { configRoot: "user_home" };
  }
  return {};
}

function assertSafeAgentRelativePath(rel: string, context: string): string {
  const norm = rel.replace(/\\/g, "/");
  if (norm.includes("..") || path.posix.isAbsolute(norm)) {
    throw new Error(`Invalid ${context} path "${rel}" (no .. or absolute segments).`);
  }
  return norm;
}

export function applyMcpJsonMergeAction(
  plan: ProviderPlan,
  action: McpJsonMergeAction,
  merge: ProviderMergeOptions,
  onFileWritten?: (absolutePath: string) => void,
  configMergeJournal?: ConfigMergeJournalEntryV1[]
): void {
  const rel = assertSafeAgentRelativePath(action.relativeTargetPath, "mcp_json_merge");
  const baseRoot = mcpMergeBaseRoot(plan, action.mergeBase);
  const dest = path.join(baseRoot, rel);
  const beforeAbsent = !fs.existsSync(dest);
  const existing = readJsonIfExists(dest);
  const beforeObj =
    existing === null || existing === undefined ? {} : (existing as Record<string, unknown>);
  const beforeCanonical = canonicalJsonStringify(beforeObj);
  const beforeSha = sha256HexCanonicalJson(beforeObj);

  const mergeLabel = mcpMergeLabelForAction(plan, action.mergeBase, rel);
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
    ...journalConfigRootForJsonMerge(action.mergeBase),
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

/**
 * Apply {@link JsonDocumentStrategyMergeAction}: JSON Pointer / deep-assign merges (task 3.8).
 * Honour {@link ProviderMergeOptions.skipConfig} without validating {@link JsonDocumentStrategyMergeAction.payload}.
 */
export function applyJsonDocumentStrategyMergeAction(
  plan: ProviderPlan,
  action: JsonDocumentStrategyMergeAction,
  merge: ProviderMergeOptions,
  onFileWritten?: (absolutePath: string) => void,
  configMergeJournal?: ConfigMergeJournalEntryV1[]
): void {
  const rel = assertSafeAgentRelativePath(action.relativeTargetPath, "json_document_strategy_merge");
  const baseRoot = mcpMergeBaseRoot(plan, action.mergeBase);
  const dest = path.join(baseRoot, rel);
  const beforeAbsent = !fs.existsSync(dest);
  const existing = readJsonIfExists(dest);
  const beforeObj =
    existing === null || existing === undefined ? {} : (existing as Record<string, unknown>);
  const beforeCanonical = canonicalJsonStringify(beforeObj);
  const beforeSha = sha256HexCanonicalJson(beforeObj);

  if (merge.skipConfig) {
    return;
  }

  const { document, changed } = mergeJsonDocumentWithStrategy(
    existing,
    action.payload,
    action.strategy
  );
  if (!changed) {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, formatJsonDocument(document), "utf8");
  onFileWritten?.(dest);
  const afterSha = sha256HexCanonicalJson(document);
  pushJournal(configMergeJournal, {
    agent_relative_path: rel,
    ...journalConfigRootForJsonMerge(action.mergeBase),
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

export function applyMcpCodexConfigTomlMergeAction(
  plan: ProviderPlan,
  action: McpCodexConfigTomlMergeAction,
  merge: ProviderMergeOptions,
  onFileWritten?: (absolutePath: string) => void,
  configMergeJournal?: ConfigMergeJournalEntryV1[]
): void {
  const layerRoot = plan.context.layerRoot;
  const rel = action.relativeTargetPath.replace(/\\/g, "/");
  if (rel.includes("..") || path.posix.isAbsolute(rel)) {
    throw new Error(
      `Invalid mcp_codex_config_toml_merge path "${action.relativeTargetPath}" (no .. or absolute segments).`
    );
  }
  const dest = path.join(layerRoot, rel);
  const beforeAbsent = !fs.existsSync(dest);
  const existingRaw = beforeAbsent ? null : fs.readFileSync(dest, "utf8");
  const beforeObj = parseCodexConfigTomlRoot(existingRaw);
  const beforeCanonical = canonicalJsonStringify(beforeObj);
  const beforeSha = sha256HexCanonicalJson(beforeObj);

  const mergeLabel = mergeConfigTargetLabel(layerRoot, rel);
  const outcome = mergeCodexConfigTomlMcp(
    existingRaw,
    action.payload,
    mcpMergeOptionsFromProvider(merge, mergeLabel)
  );
  if (outcome.status !== "applied") {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, outcome.content, "utf8");
  onFileWritten?.(dest);
  const afterObj = parseCodexConfigTomlRoot(outcome.content);
  const afterSha = sha256HexCanonicalJson(afterObj);
  pushJournal(configMergeJournal, {
    agent_relative_path: rel,
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

export function applyInterpolationPolicyAction(
  plan: ProviderPlan,
  action: InterpolationPolicyAction,
  merge: ProviderMergeOptions,
  onFileWritten?: (absolutePath: string) => void
): void {
  if (merge.skipConfig) {
    return;
  }
  const rel = assertSafeAgentRelativePath(action.relativeTargetPath, "interpolation_policy");
  const baseRoot = mcpMergeBaseRoot(plan, action.mergeBase);
  const dest = path.join(baseRoot, rel);
  if (!fs.existsSync(dest)) {
    return;
  }
  const existing = readJsonIfExists(dest);
  if (existing === null || existing === undefined) {
    return;
  }

  if (action.policy === "validate_only") {
    const issues = collectInterpolationIssuesInJson(existing);
    if (issues.length > 0) {
      throw new Error(`interpolation_policy validate_only on ${rel}: ${issues.join("; ")}`);
    }
    return;
  }

  const { doc, changed } = normalizeWorkspaceVariablesInJson(existing);
  if (!changed) {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, formatJsonDocument(doc), "utf8");
  onFileWritten?.(dest);
}
