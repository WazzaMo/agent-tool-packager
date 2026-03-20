/**
 * Station manifest/ directory: per-package YAML files under the Station root.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

import { getStationPath, pathExists } from "./paths.js";

const STATION_MANIFEST_DIR = "manifest";

/**
 * Write Station package manifest. Station manifest directory must exist.
 * @param name Package name
 * @param manifest - manifest object
 */
export function writeStationPackageManifest(
  name: string,
  manifest: { name: string; version?: string; scope?: string; source?: string }
): void {
  const stationPath = getStationPath();
  const manifestDir = path.join(stationPath, STATION_MANIFEST_DIR);
  if (!pathExists(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }
  const file = path.join(manifestDir, `${name}.yaml`);
  fs.writeFileSync(
    file,
    yaml.dump(manifest, { lineWidth: 80 }),
    "utf8"
  );
}

/**
 * Check if Station has a package manifest for the given name.
 * @param name - package file name
 * @returns boolean true if file exists, false otherwise
 */
export function stationHasPackage(name: string): boolean {
  const stationPath = getStationPath();
  const manifestPath = path.join(stationPath, STATION_MANIFEST_DIR, `${name}.yaml`);
  return fs.existsSync(manifestPath);
}

/**
 * Delete Station package manifest.
 * @param name - YAML filename
 */
export function deleteStationPackageManifest(name: string): void {
  const stationPath = getStationPath();
  const manifestPath = path.join(stationPath, STATION_MANIFEST_DIR, `${name}.yaml`);
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
  }
}
