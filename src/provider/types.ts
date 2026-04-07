/**
 * {@link AgentProvider} contract (Feature 5) for install / remove planning.
 */

import type { InstallContext } from "../file-ops/install-context.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";

import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";

import type { AtpProvenance, ProviderPlan } from "./provider-dtos.js";

/**
 * CLI merge policy for structured config (reserved for MCP/hooks; rule-only v1 ignores).
 */
export interface ProviderMergeOptions {
  forceConfig: boolean;
  skipConfig: boolean;
}

/**
 * Agent-specific install policy: build plans and apply them.
 */
export interface AgentProvider {
  planInstall(
    ctx: InstallContext,
    part: StagedPartInstallInput,
    merge: ProviderMergeOptions
  ): ProviderPlan;

  /**
   * Apply a plan from this provider (same agent / layer as `plan.context`).
   *
   * @param plan - Plan from {@link AgentProvider.planInstall}.
   * @param merge - Same options as planning.
   * @param onFileWritten - Optional absolute path callback (rollback / tests).
   */
  applyPlan(
    plan: ProviderPlan,
    merge: ProviderMergeOptions,
    onFileWritten?: (absolutePath: string) => void,
    configMergeJournal?: ConfigMergeJournalEntryV1[]
  ): void;

  planRemove(ctx: InstallContext, target: AtpProvenance): ProviderPlan;
}
