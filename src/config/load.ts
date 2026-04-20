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

import type { StationConfig, SafehouseListConfig } from "./station-config.js";
import type { SafehouseConfig } from "./types.js";

const STATION_CONFIG_FILE = "atp-config.yaml";
const SAFEHOUSE_CONFIG_FILE = "atp-config.yaml";
const SAFEHOUSE_LIST_FILE = "atp-safehouse-list.yaml";

/**
 * Parse a YAML file when its container directory exists and the file is present.
 *
 * @typeParam T - Expected document shape after `yaml.load`.
 * @param containerDirExists - Whether the enclosing directory (e.g. Station or Safehouse) exists.
 * @param yamlFilePath - Full path to the YAML file.
 * @returns Parsed document, or `null` when prerequisites fail.
 */
function loadYamlFileWhenPresent<T>(
  containerDirExists: boolean,
  yamlFilePath: string
): T | null {
  if (!containerDirExists || !fs.existsSync(yamlFilePath)) {
    return null;
  }
  const content = fs.readFileSync(yamlFilePath, "utf8");
  return yaml.load(content) as T;
}

/**
 * Load Station `atp-config.yaml`. Returns `null` if Station or the file is missing.
 *
 * @returns Parsed station configuration, or `null`.
 */
export function loadStationConfig(): StationConfig | null {
  const stationPath = getStationPath();
  const configPath = path.join(stationPath, STATION_CONFIG_FILE);
  return loadYamlFileWhenPresent<StationConfig>(pathExists(stationPath), configPath);
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
  return loadYamlFileWhenPresent<SafehouseConfig>(
    pathExists(safehousePath),
    configPath
  );
}

/**
 * Whether the Station directory exists (initialized or partially created).
 *
 * @returns `true` when `${STATION_PATH}` is an existing directory.
 */
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
 * Load Safehouse list from a given Station root (expanded absolute `.atp_safehouse` paths).
 *
 * @param stationPath - Absolute Station directory (typically {@link getStationPath}).
 * @returns Resolved paths; empty array when Station or list file is missing.
 */
export function loadSafehouseListFromStation(stationPath: string): string[] {
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
 * Load Safehouse list from Station. Returns expanded absolute paths to `.atp_safehouse` directories.
 *
 * @returns Resolved paths; empty array when Station or list file is missing.
 */
export function loadSafehouseList(): string[] {
  return loadSafehouseListFromStation(getStationPath());
}
