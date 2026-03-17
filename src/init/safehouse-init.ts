/**
 * Safehouse initialization: creates .atp_safehouse in cwd with config and manifest.
 * Registers the safehouse in the Station's safehouse_list when Station exists.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import {
  getSafehousePath,
  getStationPath,
  pathExists,
} from "../config/paths.js";
import {
  DEFAULT_SAFEHOUSE_CONFIG,
  DEFAULT_SAFEHOUSE_MANIFEST,
} from "../config/safehouse-config.js";
import { writeManifestContent } from "../config/load.js";
import type { SafehouseListConfig } from "../config/station-config.js";

const CONFIG_FILE = "atp-config.yaml";
const MANIFEST_FILE = "manifest.yaml";
const SAFEHOUSE_LIST_FILE = "safehouse_list.yaml";

function toTildePath(p: string): string {
  const home = os.homedir();
  if (p.startsWith(home + path.sep) || p === home) {
    return "~" + p.slice(home.length);
  }
  return p;
}

function registerSafehouseInStation(safehousePath: string): void {
  const stationPath = getStationPath();
  const listPath = path.join(stationPath, SAFEHOUSE_LIST_FILE);
  if (!pathExists(stationPath) || !fs.existsSync(listPath)) {
    return;
  }
  const content = fs.readFileSync(listPath, "utf8");
  const config = yaml.load(content) as SafehouseListConfig;
  const paths = config.safehouse_paths ?? [];
  const normalized = toTildePath(path.resolve(safehousePath));
  if (paths.includes(normalized)) return;
  paths.push(normalized);
  fs.writeFileSync(
    listPath,
    yaml.dump({ safehouse_paths: paths }, { lineWidth: 80 }),
    "utf8"
  );
}

export async function safehouseInit(): Promise<void> {
  const cwd = process.cwd();
  const safehousePath = getSafehousePath(cwd);

  if (fs.existsSync(safehousePath)) {
    console.log(`Safehouse already exists at ${safehousePath}`);
    return;
  }

  fs.mkdirSync(safehousePath, { recursive: true });

  const configPath = path.join(safehousePath, CONFIG_FILE);
  const manifestPath = path.join(safehousePath, MANIFEST_FILE);
  const stationPath = getStationPath();

  fs.writeFileSync(
    configPath,
    yaml.dump(DEFAULT_SAFEHOUSE_CONFIG, { lineWidth: 80 }),
    "utf8"
  );
  fs.writeFileSync(
    manifestPath,
    writeManifestContent({
      ...DEFAULT_SAFEHOUSE_MANIFEST,
      station_path: stationPath,
    }),
    "utf8"
  );

  registerSafehouseInStation(safehousePath);

  console.log(`Safehouse created at ${safehousePath}`);
  console.log(`  - ${CONFIG_FILE}`);
  console.log(`  - ${MANIFEST_FILE}`);
}
