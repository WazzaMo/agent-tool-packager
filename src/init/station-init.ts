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
const SAFEHOUSE_LIST_FILE = "safehouse_list.yaml";
const CATALOG_FILE = "atp-catalog.yaml";
const MANIFEST_DIR = "manifest";

export async function stationInit(): Promise<void> {
  const stationPath = getStationPath();

  if (fs.existsSync(stationPath)) {
    console.log(`Station already exists at ${stationPath}`);
    return;
  }

  fs.mkdirSync(stationPath, { recursive: true });
  fs.mkdirSync(path.join(stationPath, MANIFEST_DIR), { recursive: true });

  const configPath = path.join(stationPath, CONFIG_FILE);
  const safehouseListPath = path.join(stationPath, SAFEHOUSE_LIST_FILE);
  const catalogPath = path.join(stationPath, CATALOG_FILE);

  fs.writeFileSync(
    configPath,
    yaml.dump(DEFAULT_STATION_CONFIG, { lineWidth: 80 }),
    "utf8"
  );
  fs.writeFileSync(
    safehouseListPath,
    yaml.dump(DEFAULT_SAFEHOUSE_LIST, { lineWidth: 80 }),
    "utf8"
  );
  fs.writeFileSync(
    catalogPath,
    yaml.dump(DEFAULT_CATALOG, { lineWidth: 80 }),
    "utf8"
  );

  console.log(`Station created at ${stationPath}`);
  console.log(`  - ${CONFIG_FILE}`);
  console.log(`  - ${SAFEHOUSE_LIST_FILE}`);
  console.log(`  - ${CATALOG_FILE}`);
  console.log(`  - ${MANIFEST_DIR}/`);
}
