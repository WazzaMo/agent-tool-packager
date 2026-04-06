/**
 * Install catalog package file assets via {@link CursorAgentProvider} or legacy copy.
 */

import {
  copyPackageAssets,
  copyProgramAssetsOnly,
} from "./copy-assets.js";
import { createCursorAgentProvider } from "../provider/cursor-agent-provider.js";
import type { ProviderMergeOptions } from "../provider/types.js";

import { usesCursorAgentProviderProjectInstall } from "./rule-only-cursor-provider.js";

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
 */
export function installPackageAssetsForCatalogContext(
  ctx: CatalogInstallContext,
  providerCtx: InstallContext,
  stagedParts: StagedPartInstallInput[],
  onFileCopied?: (absolutePath: string) => void
): void {
  const mergeOpts = providerMergeFromInstallOptions(ctx.opts);
  const mcpCopyOpts = {
    forceConfig: mergeOpts.forceConfig,
    skipConfig: mergeOpts.skipConfig,
  };

  if (usesCursorAgentProviderProjectInstall(providerCtx, ctx.manifest, ctx.opts)) {
    const provider = createCursorAgentProvider(ctx.manifest, ctx.bundlePathMap);
    for (const part of stagedParts) {
      const plan = provider.planInstall(providerCtx, part, mergeOpts);
      provider.applyPlan(plan, mergeOpts, onFileCopied);
    }
    copyProgramAssetsOnly(
      ctx.pkgDir,
      ctx.manifest,
      ctx.installBinDir,
      onFileCopied
    );
    return;
  }

  copyPackageAssets(
    ctx.pkgDir,
    ctx.manifest,
    ctx.agentBase,
    ctx.bundlePathMap,
    ctx.installBinDir,
    onFileCopied,
    mcpCopyOpts
  );
}
