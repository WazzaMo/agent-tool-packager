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

export async function stationInit(): Promise<void> {
  const stationPath = getStationPath();

  const configPath = path.join(stationPath, CONFIG_FILE);
  const safehouseListPath = path.join(stationPath, SAFEHOUSE_LIST_FILE);
  const catalogPath = path.join(stationPath, CATALOG_FILE);
  const manifestPath = path.join(stationPath, MANIFEST_DIR);

  const exists = fs.existsSync(stationPath);
  const hasConfig = fs.existsSync(configPath);
  const hasSafehouseList = fs.existsSync(safehouseListPath);
  const hasCatalog = fs.existsSync(catalogPath);
  const hasManifest = fs.existsSync(manifestPath);

  if (exists && hasConfig && hasSafehouseList && hasCatalog && hasManifest) {
    console.log(`Station already exists at ${stationPath}`);
    return;
  }

  if (!exists) {
    fs.mkdirSync(stationPath, { recursive: true });
  }

  if (!hasManifest) {
    fs.mkdirSync(manifestPath, { recursive: true });
  }

  if (!hasConfig) {
    fs.writeFileSync(
      configPath,
      yaml.dump(DEFAULT_STATION_CONFIG, { lineWidth: 80 }),
      "utf8"
    );
  }

  if (!hasSafehouseList) {
    fs.writeFileSync(
      safehouseListPath,
      yaml.dump(DEFAULT_SAFEHOUSE_LIST, { lineWidth: 80 }),
      "utf8"
    );
  }

  if (!hasCatalog) {
    fs.writeFileSync(
      catalogPath,
      yaml.dump(DEFAULT_CATALOG, { lineWidth: 80 }),
      "utf8"
    );
  }

  console.log(`Station created or updated at ${stationPath}`);
  if (!hasConfig) console.log(`  - ${CONFIG_FILE}`);
  if (!hasSafehouseList) console.log(`  - ${SAFEHOUSE_LIST_FILE}`);
  if (!hasCatalog) console.log(`  - ${CATALOG_FILE}`);
  if (!hasManifest) console.log(`  - ${MANIFEST_DIR}/`);
}
