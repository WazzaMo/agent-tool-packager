/**
 * Remove package from project Safehouse.
 * Deletes from manifest, binaries/share, and agent skill/rule copies.
 */

import fs from "node:fs";
import path from "node:path";

import { resolveAgentProjectPath } from "../config/agent-path.js";
import {
  safehouseExists,
  loadSafehouseConfig,
  loadStationConfig,
  loadSafehouseList,
} from "../config/load.js";
import { getSafehousePath, expandHome, pathExists } from "../config/paths.js";
import {
  loadSafehouseManifest,
  removePackageFromSafehouseManifest,
  loadSafehouseManifestFromPath,
} from "../config/safehouse-manifest.js";
import { agentDestinationForAsset } from "../install/copy-assets.js";
import {
  resolvePackage,
  resolvePackagePath,
  loadPackageManifest,
} from "../install/resolve.js";

import type { PackageAsset } from "../install/types.js";

const LOCAL_BIN = "~/.local/bin";
const LOCAL_SHARE = "~/.local/share";
const LOCAL_ETC = "~/.local/etc";

/**
 * Absolute path to the user's `~/.local/bin` directory.
 *
 * @returns Resolved bin directory.
 */
function getLocalBinPath(): string {
  return path.join(expandHome(LOCAL_BIN));
}

/**
 * Absolute path to the user's `~/.local/share` root.
 *
 * @returns Resolved share root.
 */
function getLocalSharePath(): string {
  return path.join(expandHome(LOCAL_SHARE));
}

/**
 * Absolute path to the user's `~/.local/etc` root.
 *
 * @returns Resolved etc root.
 */
function getLocalEtcPath(): string {
  return path.join(expandHome(LOCAL_ETC));
}

/**
 * Remove user-wide binaries/share for `pkgName` when no other registered Safehouse still uses `user-bin`.
 *
 * @param pkgName - Package name.
 * @param currentCwd - Project base whose Safehouse path is excluded from the "still in use" scan.
 */
function removeUserBinariesIfUnused(pkgName: string, currentCwd: string): void {
  const safehousePaths = loadSafehouseList();
  const others = safehousePaths.filter(
    (p) => path.resolve(p) !== path.resolve(getSafehousePath(currentCwd))
  );

  let inUse = false;
  for (const shPath of others) {
    const manifest = loadSafehouseManifestFromPath(shPath);
    if (
      manifest?.packages?.some(
        (p) => p.name === pkgName && p.binary_scope === "user-bin"
      )
    ) {
      inUse = true;
      break;
    }
  }

  if (!inUse) {
    const localBin = getLocalBinPath();
    const shareDir = path.join(getLocalSharePath(), pkgName);
    const etcDir = path.join(getLocalEtcPath(), pkgName);

    if (pathExists(shareDir)) {
      fs.rmSync(shareDir, { recursive: true });
    }
    if (pathExists(etcDir)) {
      fs.rmSync(etcDir, { recursive: true });
    }

    const binFile = path.join(localBin, pkgName);
    if (fs.existsSync(binFile) && fs.statSync(binFile).isFile()) {
      fs.unlinkSync(binFile);
    }
    console.log(`Removed shared binaries for ${pkgName} as they are no longer in use.`);
  } else {
    console.log(`Shared binaries for ${pkgName} kept as they are still in use by other projects.`);
  }
}

/**
 * Delete skill/rule copies under the configured agent directory for listed assets.
 *
 * @param projectBase - Project root.
 * @param pkgName - Package name (unused today; reserved for logging).
 * @param assets - Manifest assets to remove from the agent tree.
 */
function removeAgentCopies(
  projectBase: string,
  pkgName: string,
  assets: PackageAsset[]
): void {
  const config = loadSafehouseConfig(projectBase);
  const stationConfig = loadStationConfig();
  const agentName = config?.agent ?? "cursor";
  const projectPath = resolveAgentProjectPath(agentName, stationConfig);
  const agentBase = path.join(projectBase, projectPath);

  for (const asset of assets) {
    if (asset.type === "program") continue;

    const { filePath: destPath } = agentDestinationForAsset(agentBase, asset);

    if (fs.existsSync(destPath)) {
      try {
        fs.unlinkSync(destPath);
      } catch (err) {
        console.warn(`Could not remove ${destPath}:`, err);
      }
    }
  }
}

/**
 * Remove project-scoped `share/`, `etc/`, and named binary under the Safehouse tree.
 *
 * @param safehousePath - Path to `.atp_safehouse`.
 * @param utility - Package name used as subdirectory / binary stem.
 */
function removeSafehouseBinariesAndShare(
  safehousePath: string,
  utility: string
): void {
  const shareDir = path.join(safehousePath, "share", utility);
  const etcDir = path.join(safehousePath, "etc", utility);
  const binDir = path.join(safehousePath, "bin");

  if (fs.existsSync(shareDir)) {
    fs.rmSync(shareDir, { recursive: true });
  }
  if (fs.existsSync(etcDir)) {
    fs.rmSync(etcDir, { recursive: true });
  }

  // Best-effort: remove binary with package name if it exists
  const binFile = path.join(binDir, utility);
  if (fs.existsSync(binFile) && fs.statSync(binFile).isFile()) {
    fs.unlinkSync(binFile);
  }
}

/**
 * Remove a package from the project Safehouse manifest and clean up installed files.
 *
 * @param pkgName - Package name as recorded in the manifest.
 * @param cwd - Project base directory; defaults to `process.cwd()`.
 */
export function removeSafehousePackage(
  pkgName: string,
  cwd: string = process.cwd()
): void {
  if (!safehouseExists(cwd)) {
    console.error("No Safehouse found. Run `atp safehouse init` first.");
    process.exit(1);
  }

  const manifest = loadSafehouseManifest(cwd);
  const packages = manifest?.packages ?? [];
  const found = packages.find((p) => p.name === pkgName);

  if (!found) {
    console.error(`Package ${pkgName} is not installed in this Safehouse.`);
    process.exit(1);
  }

  // Remove skill/rule copies - need package manifest for asset list
  const catalogPkg = resolvePackage(pkgName, cwd);
  if (catalogPkg) {
    const pkgDir = resolvePackagePath(catalogPkg.location, cwd);
    if (pkgDir) {
      const pkgManifest = loadPackageManifest(pkgDir);
      if (pkgManifest?.assets) {
        removeAgentCopies(cwd, pkgName, pkgManifest.assets);
      }
    }
  } else {
    console.warn(
      `Package ${pkgName} not found in catalog; skipping skill/rule cleanup.`
    );
  }

  const safehousePath = getSafehousePath(cwd);

  if (found.binary_scope === "user-bin") {
    removeUserBinariesIfUnused(pkgName, cwd);
  } else if (found.binary_scope === "project-bin") {
    removeSafehouseBinariesAndShare(safehousePath, pkgName);
  } else {
    // Default/fallback: just try both if scope unknown
    removeUserBinariesIfUnused(pkgName, cwd);
    removeSafehouseBinariesAndShare(safehousePath, pkgName);
  }

  removePackageFromSafehouseManifest(pkgName, cwd);

  console.log(`Removed ${pkgName} from Safehouse.`);
}
