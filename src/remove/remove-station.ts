/**
 * Remove package from Station.
 * Basic: delete manifest, remove from ~/.local/bin, share, etc.
 * --exfiltrate: copy Station assets to qualifying Safehouses first, then remove.
 */

import fs from "node:fs";
import path from "node:path";
import { stationExists, loadSafehouseList } from "../config/load.js";

import {
  stationHasPackage,
  deleteStationPackageManifest,
} from "../config/station-package-manifest.js";

import {
  loadSafehouseManifestFromPath,
  updateSafehousePackageInManifest,
} from "../config/safehouse-manifest.js";

import { expandHome, pathExists } from "../config/paths.js";

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
 * Remove package binaries and share data from the user Station layout (`~/.local`).
 *
 * @param utility - Package / utility name (binary basename and share subtree).
 */
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

/**
 * Copy `~/.local` bin/share/etc for `utility` into a Safehouse tree (`bin/`, `share/`, `etc/`).
 *
 * @param safehousePath - Absolute path to `.atp_safehouse` (or Station-listed path).
 * @param utility - Package name used as subdirectory under share/etc and bin filename.
 */
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

/**
 * Remove a package from the Station manifest and user-local install artifacts.
 * Optionally exfiltrate binaries/share to Safehouses that still reference the package.
 *
 * @param pkgName - Catalog / manifest package name.
 * @param opts - When `exfiltrate` is true, copy assets to qualifying Safehouses and mark `source: local`.
 */
export function removeStationPackage(
  pkgName: string,
  opts: { exfiltrate?: boolean } = {}
): void {
  if (!stationExists()) {
    console.error("No Station found. Run `atp station init` first.");
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
