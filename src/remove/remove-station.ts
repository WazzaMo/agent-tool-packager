/**
 * Remove package from Station.
 * Basic: delete manifest, remove from ~/.local/bin, share, etc.
 * --exfiltrate: copy Station assets to qualifying Safehouses first, then remove.
 */

import fs from "node:fs";
import path from "node:path";
import {
  stationExists,
  stationHasPackage,
  deleteStationPackageManifest,
  loadSafehouseList,
  loadSafehouseManifestFromPath,
  updateSafehousePackageInManifest,
} from "../config/load.js";
import { expandHome, pathExists } from "../config/paths.js";

const LOCAL_BIN = "~/.local/bin";
const LOCAL_SHARE = "~/.local/share";
const LOCAL_ETC = "~/.local/etc";

function getLocalBinPath(): string {
  return path.join(expandHome(LOCAL_BIN));
}

function getLocalSharePath(): string {
  return path.join(expandHome(LOCAL_SHARE));
}

function getLocalEtcPath(): string {
  return path.join(expandHome(LOCAL_ETC));
}

/** Remove package binaries and share from Station (~/.local). */
function removeStationBinariesAndShare(utility: string): void {
  const localBin = getLocalBinPath();
  const shareDir = path.join(getLocalSharePath(), utility);
  const etcDir = path.join(getLocalEtcPath(), utility);

  if (pathExists(shareDir)) {
    fs.rmSync(shareDir, { recursive: true });
  }
  if (pathExists(etcDir)) {
    fs.rmSync(etcDir, { recursive: true });
  }

  const binFile = path.join(localBin, utility);
  if (fs.existsSync(binFile) && fs.statSync(binFile).isFile()) {
    fs.unlinkSync(binFile);
  }
}

/** Copy Station binaries/share/config to a Safehouse. */
function exfiltrateToSafehouse(
  safehousePath: string,
  utility: string
): void {
  const localBin = getLocalBinPath();
  const localShare = getLocalSharePath();
  const localEtc = getLocalEtcPath();

  const safehouseBin = path.join(safehousePath, "bin");
  const safehouseShare = path.join(safehousePath, "share", utility);
  const safehouseEtc = path.join(safehousePath, "etc", utility);

  const binFile = path.join(localBin, utility);
  if (fs.existsSync(binFile) && fs.statSync(binFile).isFile()) {
    fs.mkdirSync(safehouseBin, { recursive: true });
    fs.copyFileSync(binFile, path.join(safehouseBin, utility));
  }

  const srcShare = path.join(localShare, utility);
  if (pathExists(srcShare)) {
    fs.mkdirSync(path.dirname(safehouseShare), { recursive: true });
    fs.cpSync(srcShare, safehouseShare, { recursive: true });
  }

  const srcEtc = path.join(localEtc, utility);
  if (pathExists(srcEtc)) {
    fs.mkdirSync(path.dirname(safehouseEtc), { recursive: true });
    fs.cpSync(srcEtc, safehouseEtc, { recursive: true });
  }
}

export function removeStationPackage(
  pkgName: string,
  opts: { exfiltrate?: boolean } = {}
): void {
  if (!stationExists()) {
    console.error("No Station found. Run `ahq station init` first.");
    process.exit(1);
  }

  if (!stationHasPackage(pkgName)) {
    console.error(`Package ${pkgName} is not installed in the Station.`);
    process.exit(1);
  }

  if (opts.exfiltrate) {
    const safehousePaths = loadSafehouseList();
    if (safehousePaths.length === 0) {
      console.warn("No Safehouses registered in safehouse_list; nothing to exfiltrate.");
    } else {
      for (const safehousePath of safehousePaths) {
        const manifest = loadSafehouseManifestFromPath(safehousePath);
        const hasPkg = manifest?.packages?.some((p) => p.name === pkgName);
        if (!hasPkg) continue;

        if (!pathExists(safehousePath)) {
          console.warn(`Safehouse ${safehousePath} does not exist; skipping.`);
          continue;
        }

        exfiltrateToSafehouse(safehousePath, pkgName);
        updateSafehousePackageInManifest(pkgName, { source: "local" }, path.dirname(safehousePath));
        console.log(`Exfiltrated ${pkgName} to ${safehousePath}`);
      }
    }
  }

  removeStationBinariesAndShare(pkgName);
  deleteStationPackageManifest(pkgName);

  console.log(`Removed ${pkgName} from Station.`);
}
