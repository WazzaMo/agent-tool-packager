/**
 * Discover registered project Safehouses (via atp-safehouse-list.yaml) that list a package.
 */

import path from "node:path";

import { loadSafehouseListFromStation } from "../config/load.js";
import { loadSafehouseManifestFromPath } from "../config/safehouse-manifest.js";
import { pathExists } from "../config/paths.js";

/**
 * Project roots whose registered `.atp_safehouse/manifest.yaml` still lists `pkgName`.
 *
 * @param stationPath - Station directory containing `atp-safehouse-list.yaml`.
 * @param pkgName - Package name (trimmed for comparison).
 * @returns Sorted unique absolute project base paths.
 */
export function sortedProjectBasesWithPackageInRegisteredSafehouses(
  stationPath: string,
  pkgName: string
): string[] {
  const name = pkgName.trim();
  const bases = new Set<string>();
  for (const shPath of loadSafehouseListFromStation(stationPath)) {
    if (!pathExists(shPath)) {
      continue;
    }
    const manifest = loadSafehouseManifestFromPath(shPath);
    if (manifest?.packages?.some((p) => p.name === name)) {
      bases.add(path.resolve(path.dirname(shPath)));
    }
  }
  return [...bases].sort();
}
