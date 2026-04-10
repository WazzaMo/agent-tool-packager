/**
 * Per-action handlers for {@link applyProviderPlan} (re-exports split modules).
 */

export {
  readJsonIfExists,
  mcpMergeOptionsFromProvider,
  pushJournal,
  applyPlainMarkdownWriteAction,
  applyRawFileCopyAction,
  applyDeleteManagedFileAction,
} from "./apply-provider-plan-base.js";

export {
  applyMcpJsonMergeAction,
  applyJsonDocumentStrategyMergeAction,
  applyMcpCodexConfigTomlMergeAction,
  applyHooksJsonMergeAction,
} from "./apply-provider-plan-merge.js";
