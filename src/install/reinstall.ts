/**
 * Re-install all Safehouse packages for the current agent.
 * Used during agent handover.
 */

import path from "node:path";

import { resolveAgentProjectPath } from "../config/agent-path.js";
import { loadStationConfig, loadSafehouseConfig } from "../config/load.js";
import { loadSafehouseManifest } from "../config/safehouse-manifest.js";


import {
  buildProviderInstallContext,
  prepareCatalogInstallPartInputs,
} from "./install.js";
import { buildBundleInstallPathMap } from "./bundle-path-map.js";
import { installPackageAssetsForCatalogContext } from "./install-package-assets.js";
import type { CatalogInstallContext } from "./types.js";
import {
  resolvePackage,
  resolvePackagePath,
  loadPackageManifest,
} from "./resolve.js";


/**
 * Resolve agent base path for the given agent.
 * @param projectBase - Project root directory.
 * @param agentName - Agent name (e.g. cursor).
 * @returns Absolute path to agent directory (e.g. .cursor/).
 */
function getAgentBasePath(projectBase: string, agentName: string): string {
  const stationConfig = loadStationConfig();
  const projectPath = resolveAgentProjectPath(agentName, stationConfig);
  return path.join(projectBase, projectPath);
}

/**
 * Re-install all packages in the Safehouse manifest for the currently configured agent.
 * Used during agent handover to copy skills/rules to the new agent directory.
 *
 * @param projectBase - Project root directory.
 * @returns Resolves when each listed package has been re-copied (no-op when empty or no agent).
 */
export async function reinstallSafehousePackages(
  projectBase: string
): Promise<void> {
  const manifest = loadSafehouseManifest(projectBase);
  if (!manifest || !manifest.packages || manifest.packages.length === 0) {
    return;
  }

  const config = loadSafehouseConfig(projectBase);
  const agentName = config?.agent;
  if (!agentName) return;

  const agentBase = getAgentBasePath(projectBase, agentName);

  for (const pkgInfo of manifest.packages) {
    const catalogPkg = resolvePackage(pkgInfo.name, projectBase);
    if (!catalogPkg) continue;

    const pkgDir = resolvePackagePath(catalogPkg.location, projectBase);
    if (!pkgDir) continue;

    const pkgManifest = loadPackageManifest(pkgDir);
    if (!pkgManifest) continue;

    const binaryScope = pkgInfo.binary_scope ?? "user-bin";
    const bundlePathMap = buildBundleInstallPathMap(
      pkgManifest,
      binaryScope,
      projectBase
    );

    const ctx: CatalogInstallContext = {
      pkgDir,
      manifest: pkgManifest,
      agentBase,
      bundlePathMap,
      installBinDir: undefined,
      catalogPkg,
      opts: {
        promptScope: "project",
        binaryScope,
        dependencies: false,
      },
      projectBase,
    };
    const providerCtx = buildProviderInstallContext(ctx);
    const stagedParts = prepareCatalogInstallPartInputs(ctx);
    installPackageAssetsForCatalogContext(ctx, providerCtx, stagedParts);
    console.log(`  - Re-installed ${pkgInfo.name} for ${agentName}`);
  }
}
