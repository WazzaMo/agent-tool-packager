/**
 * Remove user-wide `~/.local` binaries and share when no other Safehouse still references the package.
 */

import fs from "node:fs";
import path from "node:path";

import { loadSafehouseList } from "../config/load.js";
import { loadSafehouseManifestFromPath } from "../config/safehouse-manifest.js";
import { getSafehousePath, expandHome, pathExists } from "../config/paths.js";

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
export function removeUserBinariesIfUnused(pkgName: string, currentCwd: string): void {
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
