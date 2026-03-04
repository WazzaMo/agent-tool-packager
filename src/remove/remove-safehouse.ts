/**
 * Remove package from project Safehouse.
 * Deletes from manifest, binaries/share, and agent skill/rule copies.
 */

import fs from "node:fs";
import path from "node:path";
import {
  safehouseExists,
  loadSafehouseManifest,
  loadSafehouseConfig,
  loadStationConfig,
  removePackageFromSafehouseManifest,
} from "../config/load.js";
import { getSafehousePath } from "../config/paths.js";
import { resolveAgentProjectPath } from "../config/agent-path.js";
import {
  resolvePackage,
  resolvePackagePath,
  loadPackageManifest,
} from "../install/resolve.js";
import type { PackageAsset } from "../install/types.js";

const ASSET_TYPES_TO_AGENT_SUBDIR: Record<string, string> = {
  skill: "skills",
  rule: "rules",
  "sub-agent": "rules",
  program: "bin",
};

function removeAgentCopies(
  cwd: string,
  pkgName: string,
  assets: PackageAsset[]
): void {
  const config = loadSafehouseConfig(cwd);
  const stationConfig = loadStationConfig();
  const agentName = config?.agent ?? "cursor";
  const projectPath = resolveAgentProjectPath(agentName, stationConfig);
  const agentBase = path.join(cwd, projectPath);

  for (const asset of assets) {
    if (asset.type === "program") continue;

    const subdir = ASSET_TYPES_TO_AGENT_SUBDIR[asset.type] ?? "skills";
    const baseName = path.basename(asset.path);
    const destPath = path.join(agentBase, subdir, baseName);

    if (fs.existsSync(destPath)) {
      try {
        fs.unlinkSync(destPath);
      } catch (err) {
        console.warn(`Could not remove ${destPath}:`, err);
      }
    }
  }
}

/** Remove package binaries and share data from Safehouse. */
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

export function removeSafehousePackage(
  pkgName: string,
  cwd: string = process.cwd()
): void {
  if (!safehouseExists(cwd)) {
    console.error("No Safehouse found. Run `ahq safehouse init` first.");
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
  removeSafehouseBinariesAndShare(safehousePath, pkgName);

  removePackageFromSafehouseManifest(pkgName, cwd);

  console.log(`Removed ${pkgName} from Safehouse.`);
}
