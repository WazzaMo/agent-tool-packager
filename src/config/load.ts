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
