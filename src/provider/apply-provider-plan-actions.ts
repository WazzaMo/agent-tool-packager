/**
 * Per-action handlers for {@link applyProviderPlan} (re-exports split modules).
 */

export {
  readJsonIfExists,
  mcpMergeOptionsFromProvider,
  pushJournal,
  applyMarkdownManagedBlockPatchAction,
  applyPlainMarkdownWriteAction,
  applyRawFileCopyAction,
  applyDeleteManagedFileAction,
  applyDiscoveryHintAppendAction,
  applyOpaquePayloadAction,
} from "./apply-provider-plan-base.js";

export {
  applyMcpJsonMergeAction,
  applyJsonDocumentStrategyMergeAction,
  applyMcpCodexConfigTomlMergeAction,
  applyHooksJsonMergeAction,
  applyInterpolationPolicyAction,
} from "./apply-provider-plan-merge.js";
