/**
 * Execute {@link ProviderPlan.actions} in order against `plan.context.layerRoot`.
 */

import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";

import {
  applyCodexConfigTomlHooksFeatureMergeAction,
  applyDeleteManagedFileAction,
  applyDiscoveryHintAppendAction,
  applyHooksJsonMergeAction,
  applyInterpolationPolicyAction,
  applyJsonDocumentStrategyMergeAction,
  applyMarkdownManagedBlockPatchAction,
  applyMcpCodexConfigTomlMergeAction,
  applyMcpJsonMergeAction,
  applyOpaquePayloadAction,
  applyPlainMarkdownWriteAction,
  applyRawFileCopyAction,
} from "./apply-provider-plan-actions.js";

import type { ProviderPlan } from "./provider-dtos.js";
import type { ProviderMergeOptions } from "./types.js";

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
  const ctx = plan.context;

  for (const action of plan.actions) {
    if (action.kind === "plain_markdown_write") {
      applyPlainMarkdownWriteAction(ctx, action, onFileWritten);
      continue;
    }
    if (action.kind === "markdown_managed_block_patch") {
      applyMarkdownManagedBlockPatchAction(ctx, action, onFileWritten);
      continue;
    }
    if (action.kind === "mcp_json_merge") {
      applyMcpJsonMergeAction(plan, action, merge, onFileWritten, configMergeJournal);
      continue;
    }
    if (action.kind === "json_document_strategy_merge") {
      applyJsonDocumentStrategyMergeAction(plan, action, merge, onFileWritten, configMergeJournal);
      continue;
    }
    if (action.kind === "mcp_codex_config_toml_merge") {
      applyMcpCodexConfigTomlMergeAction(plan, action, merge, onFileWritten, configMergeJournal);
      continue;
    }
    if (action.kind === "codex_config_toml_hooks_feature_merge") {
      applyCodexConfigTomlHooksFeatureMergeAction(
        plan,
        action,
        merge,
        onFileWritten,
        configMergeJournal
      );
      continue;
    }
    if (action.kind === "hooks_json_merge") {
      applyHooksJsonMergeAction(plan, action, merge, onFileWritten, configMergeJournal);
      continue;
    }
    if (action.kind === "interpolation_policy") {
      applyInterpolationPolicyAction(plan, action, merge, onFileWritten);
      continue;
    }
    if (action.kind === "discovery_hint_append") {
      applyDiscoveryHintAppendAction(ctx, action, onFileWritten);
      continue;
    }
    if (action.kind === "opaque_payload") {
      applyOpaquePayloadAction(ctx, action, onFileWritten);
      continue;
    }
    if (action.kind === "raw_file_copy") {
      applyRawFileCopyAction(ctx, action, onFileWritten);
      continue;
    }
    if (action.kind === "delete_managed_file") {
      applyDeleteManagedFileAction(ctx, action, onFileWritten);
    }
  }
}
