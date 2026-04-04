/**
 * Station initialization: creates ~/.atp_station (or STATION_PATH) with config files.
 */

import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { getStationPath } from "../config/paths.js";
import {
  DEFAULT_STATION_CONFIG,
  DEFAULT_SAFEHOUSE_LIST,
  DEFAULT_CATALOG,
} from "../config/station-config.js";

const CONFIG_FILE = "atp-config.yaml";
const SAFEHOUSE_LIST_FILE = "atp-safehouse-list.yaml";
const CATALOG_FILE = "atp-catalog.yaml";
const MANIFEST_DIR = "manifest";

/** Which Station files and directories already exist on disk. */
type StationLayoutFlags = {
  stationPath: string;
  exists: boolean;
  hasConfig: boolean;
  hasSafehouseList: boolean;
  hasCatalog: boolean;
  hasManifest: boolean;
};

/**
 * Inspect the Station directory for default layout files.
 *
 * @returns Paths and booleans for each expected artifact.
 */
function readStationLayoutFlags(): StationLayoutFlags {
  const stationPath = getStationPath();
  const configPath = path.join(stationPath, CONFIG_FILE);
  const safehouseListPath = path.join(stationPath, SAFEHOUSE_LIST_FILE);
  const catalogPath = path.join(stationPath, CATALOG_FILE);
  const manifestPath = path.join(stationPath, MANIFEST_DIR);

  const exists = fs.existsSync(stationPath);
  return {
    stationPath,
    exists,
    hasConfig: fs.existsSync(configPath),
    hasSafehouseList: fs.existsSync(safehouseListPath),
    hasCatalog: fs.existsSync(catalogPath),
    hasManifest: fs.existsSync(manifestPath),
  };
}

/**
 * Whether all required Station artifacts are already present.
 *
 * @param flags - Result of {@link readStationLayoutFlags}.
 * @returns `true` when init is a no-op.
 */
function isStationLayoutComplete(flags: StationLayoutFlags): boolean {
  return (
    flags.exists &&
    flags.hasConfig &&
    flags.hasSafehouseList &&
    flags.hasCatalog &&
    flags.hasManifest
  );
}

/**
 * Create Station root and `manifest/` when they are missing.
 *
 * @param flags - Current layout; mutated only on disk, not in-memory.
 */
function ensureStationRootAndManifestDir(flags: StationLayoutFlags): void {
  if (!flags.exists) {
    fs.mkdirSync(flags.stationPath, { recursive: true });
  }
  if (!flags.hasManifest) {
    fs.mkdirSync(path.join(flags.stationPath, MANIFEST_DIR), { recursive: true });
  }
}

/**
 * Write default YAML files for any missing Station config artifacts.
 *
 * @param flags - Layout flags used to choose which files to create.
 */
function writeMissingStationYamlFiles(flags: StationLayoutFlags): void {
  const { stationPath } = flags;

  if (!flags.hasConfig) {
    fs.writeFileSync(
      path.join(stationPath, CONFIG_FILE),
      yaml.dump(DEFAULT_STATION_CONFIG, { lineWidth: 80 }),
      "utf8"
    );
  }

  if (!flags.hasSafehouseList) {
    fs.writeFileSync(
      path.join(stationPath, SAFEHOUSE_LIST_FILE),
      yaml.dump(DEFAULT_SAFEHOUSE_LIST, { lineWidth: 80 }),
      "utf8"
    );
  }

  if (!flags.hasCatalog) {
    fs.writeFileSync(
      path.join(stationPath, CATALOG_FILE),
      yaml.dump(DEFAULT_CATALOG, { lineWidth: 80 }),
      "utf8"
    );
  }
}

/**
 * Log which files were created (only those that were missing before init).
 *
 * @param flags - Pre-init layout snapshot.
 */
function logStationInitSummary(flags: StationLayoutFlags): void {
  console.log(`Station created or updated at ${flags.stationPath}`);
  if (!flags.hasConfig) console.log(`  - ${CONFIG_FILE}`);
  if (!flags.hasSafehouseList) console.log(`  - ${SAFEHOUSE_LIST_FILE}`);
  if (!flags.hasCatalog) console.log(`  - ${CATALOG_FILE}`);
  if (!flags.hasManifest) console.log(`  - ${MANIFEST_DIR}/`);
}

/**
 * Create or top up the Station directory with default config, catalog, safehouse list, and manifest dir.
 *
 * @returns Resolves when filesystem writes complete.
 */
export async function stationInit(): Promise<void> {
  const flags = readStationLayoutFlags();

  if (isStationLayoutComplete(flags)) {
    console.log(`Station already exists at ${flags.stationPath}`);
    return;
  }

  ensureStationRootAndManifestDir(flags);
  writeMissingStationYamlFiles(flags);
  logStationInitSummary(flags);
}
