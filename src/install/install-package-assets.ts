/**
 * Install catalog package file assets via Cursor, Gemini, Claude, Codex provider or legacy copy.
 */

import { collectSkillAdjacentProgramPathsForInstall } from "../provider/skill/skill-adjacent-programs.js";

import {
  copyPackageAssets,
  copyProgramAssetsOnly,
} from "./copy-assets.js";
import type { ConfigMergeJournalEntryV1 } from "../config/config-merge-journal.js";

import { createClaudeAgentProvider } from "../provider/claude-agent-provider.js";
import { createCodexAgentProvider } from "../provider/codex-agent-provider.js";
import { createCursorAgentProvider } from "../provider/cursor-agent-provider.js";
import { createGeminiAgentProvider } from "../provider/gemini-agent-provider.js";
import type { ProviderMergeOptions } from "../provider/types.js";

import {
  usesClaudeAgentProviderCatalogInstall,
  usesCodexAgentProviderProjectInstall,
  usesCursorAgentProviderProjectInstall,
  usesGeminiAgentProviderProjectInstall,
} from "./catalog-install-agent-provider-routing.js";

import type { CatalogInstallContext, InstallOptions } from "./types.js";
import type { InstallContext } from "../file-ops/install-context.js";
import type { StagedPartInstallInput } from "../file-ops/part-install-input.js";

function providerMergeFromInstallOptions(opts: InstallOptions): ProviderMergeOptions {
  return {
    forceConfig: opts.forceConfig ?? false,
    skipConfig: opts.skipConfig ?? false,
  };
}

/**
 * Copy or provider-install assets for one catalog resolution.
 *
 * @param ctx - Catalog install context.
 * @param providerCtx - Provider roots and agent.
 * @param stagedParts - One staged part per manifest part (legacy: single synthetic part).
 * @param onFileCopied - Optional callback for rollback (absolute destination paths).
 * @param configMergeJournalOut - When set, collects MCP/hooks merge journal entries (provider path).
 */
export function installPackageAssetsForCatalogContext(
  ctx: CatalogInstallContext,
  providerCtx: InstallContext,
  stagedParts: StagedPartInstallInput[],
  onFileCopied?: (absolutePath: string) => void,
  configMergeJournalOut?: ConfigMergeJournalEntryV1[]
): void {
  const mergeOpts = providerMergeFromInstallOptions(ctx.opts);
  const mcpCopyOpts = {
    forceConfig: mergeOpts.forceConfig,
    skipConfig: mergeOpts.skipConfig,
  };

  const skipSkillAdjacentPrograms = collectSkillAdjacentProgramPathsForInstall(
    ctx.manifest,
    stagedParts
  );

  // Gemini: layerRoot is project `.gemini/` only (not `.agents/`); provider paths are relative to it.
  if (usesGeminiAgentProviderProjectInstall(providerCtx, ctx.manifest, ctx.opts)) {
    const provider = createGeminiAgentProvider(ctx.manifest, ctx.bundlePathMap);
    for (const part of stagedParts) {
      const plan = provider.planInstall(providerCtx, part, mergeOpts);
      provider.applyPlan(plan, mergeOpts, onFileCopied, configMergeJournalOut);
    }
    copyProgramAssetsOnly(
      ctx.pkgDir,
      ctx.manifest,
      ctx.installBinDir,
      onFileCopied,
      skipSkillAdjacentPrograms
    );
    return;
  }

  if (usesCodexAgentProviderProjectInstall(providerCtx, ctx.manifest, ctx.opts)) {
    const provider = createCodexAgentProvider(ctx.manifest, ctx.bundlePathMap);
    for (const part of stagedParts) {
      const plan = provider.planInstall(providerCtx, part, mergeOpts);
      provider.applyPlan(plan, mergeOpts, onFileCopied, configMergeJournalOut);
    }
    copyProgramAssetsOnly(
      ctx.pkgDir,
      ctx.manifest,
      ctx.installBinDir,
      onFileCopied,
      skipSkillAdjacentPrograms
    );
    return;
  }

  if (usesClaudeAgentProviderCatalogInstall(providerCtx, ctx.manifest, ctx.opts)) {
    const provider = createClaudeAgentProvider(ctx.manifest, ctx.bundlePathMap);
    for (const part of stagedParts) {
      const plan = provider.planInstall(providerCtx, part, mergeOpts);
      provider.applyPlan(plan, mergeOpts, onFileCopied, configMergeJournalOut);
    }
    copyProgramAssetsOnly(
      ctx.pkgDir,
      ctx.manifest,
      ctx.installBinDir,
      onFileCopied,
      skipSkillAdjacentPrograms
    );
    return;
  }

  if (usesCursorAgentProviderProjectInstall(providerCtx, ctx.manifest, ctx.opts)) {
    const provider = createCursorAgentProvider(ctx.manifest, ctx.bundlePathMap);
    for (const part of stagedParts) {
      const plan = provider.planInstall(providerCtx, part, mergeOpts);
      provider.applyPlan(plan, mergeOpts, onFileCopied, configMergeJournalOut);
    }
    copyProgramAssetsOnly(
      ctx.pkgDir,
      ctx.manifest,
      ctx.installBinDir,
      onFileCopied,
      skipSkillAdjacentPrograms
    );
    return;
  }

  const legacyClaudeMerge =
    providerCtx.agent === "claude" && providerCtx.layer === "project"
      ? { projectRoot: ctx.projectBase, claudeAgentDir: ctx.agentBase }
      : undefined;

  copyPackageAssets(
    ctx.pkgDir,
    ctx.manifest,
    ctx.agentBase,
    ctx.bundlePathMap,
    ctx.installBinDir,
    onFileCopied,
    mcpCopyOpts,
    legacyClaudeMerge
  );
}
