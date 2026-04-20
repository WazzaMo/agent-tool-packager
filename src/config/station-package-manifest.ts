/**
 * Station manifest/ directory: per-package YAML files under the Station root.
 */

import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { getStationPath, pathExists } from "./paths.js";

const STATION_MANIFEST_DIR = "manifest";

/**
 * Write Station package manifest under `manifest/<name>.yaml`.
 *
 * @param name - Package name (filename stem).
 * @param manifest - Serialized manifest fields.
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
 *
 * @param name - Package name (filename stem).
 * @returns `true` when `manifest/<name>.yaml` exists.
 */
export function stationHasPackage(name: string): boolean {
  const stationPath = getStationPath();
  const manifestPath = path.join(stationPath, STATION_MANIFEST_DIR, `${name}.yaml`);
  return fs.existsSync(manifestPath);
}

/**
 * Delete Station package manifest file when present.
 *
 * @param name - Package name (filename stem).
 */
export function deleteStationPackageManifest(name: string): void {
  const stationPath = getStationPath();
  const manifestPath = path.join(stationPath, STATION_MANIFEST_DIR, `${name}.yaml`);
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
  }
}
