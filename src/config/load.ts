/**
 * Config loading and writing: reads/writes Station and Safehouse config.
 * Respects STATION_PATH for Station location.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  getStationPath,
  getSafehousePath,
  pathExists,
  expandHome,
} from "./paths.js";
import type {
  StationConfig,
  SafehouseListConfig,
} from "./station-config.js";
import type {
  SafehouseConfig,
  SafehouseManifest,
  PackageSource,
  BinaryScope,
} from "./types.js";

const STATION_CONFIG_FILE = "atp-config.yaml";
const SAFEHOUSE_CONFIG_FILE = "atp-config.yaml";
const SAFEHOUSE_MANIFEST_FILE = "manifest.yaml";

/** Top-level key in manifest.yaml per docs/features/3-package-install-process.md */
const SAFEHOUSE_MANIFEST_KEY = "Safehouse-Manifest";

function parseManifest(raw: unknown): SafehouseManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const inner = obj[SAFEHOUSE_MANIFEST_KEY] ?? obj;
  if (!inner || typeof inner !== "object") return null;
  const m = inner as Record<string, unknown>;
  const packages = Array.isArray(m.packages) ? m.packages : [];
  return {
    packages: packages as SafehouseManifest["packages"],
    station_path: (m.station_path as string | null) ?? null,
  };
}

/** Serialize manifest with Safehouse-Manifest wrapper for manifest.yaml. */
export function writeManifestContent(manifest: SafehouseManifest): string {
  return yaml.dump(
    { [SAFEHOUSE_MANIFEST_KEY]: manifest },
    { lineWidth: 80 }
  );
}

/** Load Station config. Returns null if Station does not exist. */
export function loadStationConfig(): StationConfig | null {
  const stationPath = getStationPath();
  const configPath = path.join(stationPath, STATION_CONFIG_FILE);

  if (!pathExists(stationPath) || !fs.existsSync(configPath)) {
    return null;
  }

  const content = fs.readFileSync(configPath, "utf8");
  return yaml.load(content) as StationConfig;
}

/**
 * Load Safehouse config from .atp_safehouse/atp-config.yaml.
 * @param projectBase - Project base directory (use findProjectBase when in subdirs). Defaults to process.cwd().
 * @returns Safehouse config or null if Safehouse does not exist.
 */
export function loadSafehouseConfig(
  projectBase: string = process.cwd()
): SafehouseConfig | null {
  const safehousePath = getSafehousePath(projectBase);
  const configPath = path.join(safehousePath, SAFEHOUSE_CONFIG_FILE);

  if (!pathExists(safehousePath) || !fs.existsSync(configPath)) {
    return null;
  }

  const content = fs.readFileSync(configPath, "utf8");
  return yaml.load(content) as SafehouseConfig;
}

/**
 * Load Safehouse manifest (manifest.yaml) with Safehouse-Manifest wrapper.
 * @param projectBase - Project base directory. Defaults to process.cwd().
 * @returns Safehouse manifest or null if Safehouse does not exist.
 */
export function loadSafehouseManifest(
  projectBase: string = process.cwd()
): SafehouseManifest | null {
  const safehousePath = getSafehousePath(projectBase);
  const manifestPath = path.join(safehousePath, SAFEHOUSE_MANIFEST_FILE);

  if (!pathExists(safehousePath) || !fs.existsSync(manifestPath)) {
    return null;
  }

  const content = fs.readFileSync(manifestPath, "utf8");
  const raw = yaml.load(content);
  return parseManifest(raw);
}

/** Check if Station is initialized. */
export function stationExists(): boolean {
  return pathExists(getStationPath());
}

/**
 * Check if Safehouse exists in project directory.
 * @param projectBase - Project base directory. Defaults to process.cwd().
 * @returns True if .atp_safehouse exists.
 */
export function safehouseExists(projectBase: string = process.cwd()): boolean {
  return pathExists(getSafehousePath(projectBase));
}

/**
 * Write Safehouse config. Safehouse must exist.
 * @param config - Safehouse config to write.
 * @param projectBase - Project base directory. Defaults to process.cwd().
 */
export function writeSafehouseConfig(
  config: SafehouseConfig,
  projectBase: string = process.cwd()
): void {
  const safehousePath = getSafehousePath(projectBase);
  const configPath = path.join(safehousePath, SAFEHOUSE_CONFIG_FILE);
  fs.writeFileSync(
    configPath,
    yaml.dump(config, { lineWidth: 80 }),
    "utf8"
  );
}

/**
 * Add or update package in Safehouse manifest. Safehouse must exist.
 * @param name - Package name.
 * @param version - Package version.
 * @param binaryScope - user-bin or project-bin.
 * @param source - station or local.
 * @param projectBase - Project base directory. Defaults to process.cwd().
 */
export function addPackageToSafehouseManifest(
  name: string,
  version: string | undefined,
  binaryScope: BinaryScope = "user-bin",
  source: PackageSource = "station",
  projectBase: string = process.cwd()
): void {
  const safehousePath = getSafehousePath(projectBase);
  const manifestPath = path.join(safehousePath, SAFEHOUSE_MANIFEST_FILE);

  const existing = loadSafehouseManifest(projectBase);
  const packages = existing?.packages ?? [];
  const stationPath = existing?.station_path ?? null;

  const filtered = packages.filter((p) => p.name !== name);
  filtered.push({
    name,
    version,
    source,
    binary_scope: binaryScope,
  });

  fs.writeFileSync(
    manifestPath,
    writeManifestContent({ packages: filtered, station_path: stationPath }),
    "utf8"
  );
}

const STATION_MANIFEST_DIR = "manifest";

/** Write Station package manifest. Station manifest directory must exist.
 * @param name Package name
 * @param manifest - manifest object
 * @return void
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

const SAFEHOUSE_LIST_FILE = "safehouse_list.yaml";

/**
 * Load Safehouse list from Station. Returns expanded absolute paths to .atp_safehouse directories.
 * @returns Array<string>
 */
export function loadSafehouseList(): string[] {
  const stationPath = getStationPath();
  const listPath = path.join(stationPath, SAFEHOUSE_LIST_FILE);
  if (!pathExists(stationPath) || !fs.existsSync(listPath)) {
    return [];
  }
  const content = fs.readFileSync(listPath, "utf8");
  const config = yaml.load(content) as SafehouseListConfig | null;
  const raw = config?.safehouse_paths ?? [];
  return raw.map((p) => path.resolve(expandHome(p)));
}

/**
 * Remove package from Safehouse manifest. Safehouse must exist.
 * @param name - Package name to remove.
 * @param cwd - Project base directory. Defaults to process.cwd().
 */
export function removePackageFromSafehouseManifest(
  name: string,
  cwd: string = process.cwd()
): void {
  const existing = loadSafehouseManifest(cwd);
  if (!existing) return;

  const packages = (existing.packages ?? []).filter((p) => p.name !== name);
  const stationPath = existing.station_path ?? null;

  const safehousePath = getSafehousePath(cwd);
  const manifestPath = path.join(safehousePath, SAFEHOUSE_MANIFEST_FILE);
  fs.writeFileSync(
    manifestPath,
    writeManifestContent({ packages, station_path: stationPath }),
    "utf8"
  );
}

/**
 * Update a package entry in Safehouse manifest (e.g. set source: "local").
 * @param name - Package name to update.
 * @param updates - Fields to update.
 * @param cwd - Project base directory. Defaults to process.cwd().
 */
export function updateSafehousePackageInManifest(
  name: string,
  updates: { source?: PackageSource },
  cwd: string = process.cwd()
): void {
  const existing = loadSafehouseManifest(cwd);
  if (!existing) return;

  const packages = (existing.packages ?? []).map((p) =>
    p.name === name ? { ...p, ...updates } : p
  );
  const stationPath = existing.station_path ?? null;

  const safehousePath = getSafehousePath(cwd);
  const manifestPath = path.join(safehousePath, SAFEHOUSE_MANIFEST_FILE);
  fs.writeFileSync(
    manifestPath,
    writeManifestContent({ packages, station_path: stationPath }),
    "utf8"
  );
}

/**
 * Load Safehouse manifest from a Safehouse path (e.g. /path/to/proj/.atp_safehouse).
 * @param safehousePath path to project Safehouse
 * @returns SafehouseManifest object.
 */
export function loadSafehouseManifestFromPath(
  safehousePath: string
): SafehouseManifest | null {
  const manifestPath = path.join(safehousePath, SAFEHOUSE_MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) return null;
  const content = fs.readFileSync(manifestPath, "utf8");
  const raw = yaml.load(content);
  return parseManifest(raw);
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

/** Delete Station package manifest.
 *  @param name - YAML filename
 */
export function deleteStationPackageManifest(name: string): void {
  const stationPath = getStationPath();
  const manifestPath = path.join(stationPath, STATION_MANIFEST_DIR, `${name}.yaml`);
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
  }
}
