/**
 * Copy package assets (skills, rules, programs) to project agent directory.
 * Programs are copied to user-bin (~/.local/bin) or project-bin (.atp_safehouse/{pkg}-exec/bin).
 * Patches {bundle_name} placeholders in markdown per Feature 3.
 */

import type { PackageManifest } from "./types.js";

import {
  agentDestinationForAsset,
  agentProviderRemovalDestination,
  patchMarkdownBundlePlaceholders,
  type LegacyClaudeMergeContext,
} from "./copy-asset-support.js";

import { copyPackageAsset } from "./copy-package-asset.js";

export {
  agentDestinationForAsset,
  agentProviderRemovalDestination,
  patchMarkdownBundlePlaceholders,
  type LegacyClaudeMergeContext,
};

/**
 * Copy all assets from manifest to agent directory (skills, rules) and optionally to bin.
 *
 * @param pkgDir - Package directory.
 * @param manifest - Package manifest with assets.
 * @param agentBase - Agent base path.
 * @param bundlePathMap - Optional map for `{bundle_name}` placeholder patching.
 * @param installBinDir - Optional bin directory for program assets.
 * @param onFileCopied - Optional hook for each file written (used for install rollback).
 */
export function copyPackageAssets(
  pkgDir: string,
  manifest: PackageManifest,
  agentBase: string,
  bundlePathMap?: Record<string, string>,
  installBinDir?: string,
  onFileCopied?: (destAbsolute: string) => void,
  mcpMerge?: { forceConfig: boolean; skipConfig: boolean },
  legacyClaude?: LegacyClaudeMergeContext
): void {
  const assets = manifest.assets ?? [];
  for (const asset of assets) {
    copyPackageAsset(
      pkgDir,
      agentBase,
      asset,
      bundlePathMap,
      installBinDir,
      onFileCopied,
      mcpMerge,
      legacyClaude
    );
  }
}

function posixAssetPath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Copy only `program` assets from the manifest (used after {@link CursorAgentProvider} handles the rest).
 *
 * @param pkgDir - Package extract directory.
 * @param manifest - Catalog manifest with `assets`.
 * @param installBinDir - Destination for executables.
 * @param onFileCopied - Optional rollback hook.
 * @param skipProgramPaths - Staged paths (POSIX) already installed under skill `scripts/`; omitted from `bin/`.
 */
export function copyProgramAssetsOnly(
  pkgDir: string,
  manifest: PackageManifest,
  installBinDir: string | undefined,
  onFileCopied?: (destAbsolute: string) => void,
  skipProgramPaths?: ReadonlySet<string>
): void {
  const assets = manifest.assets ?? [];
  for (const asset of assets) {
    if (asset.type === "program") {
      if (skipProgramPaths?.has(posixAssetPath(asset.path))) {
        continue;
      }
      copyPackageAsset(pkgDir, "", asset, undefined, installBinDir, onFileCopied);
    }
  }
}
