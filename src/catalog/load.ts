/**
 * Load catalogs from global (bundled), user (Station), and project sources.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { getStationPath, pathExists, findProjectBase } from "../config/paths.js";
import type { Catalog, CatalogPackage } from "./types.js";

const USER_CATALOG_FILE = "atp-catalog.yaml";
const PROJECT_CATALOG_FILE = "catalog.yaml";
const PROJECT_CATALOG_DIR = ".atp-local";

/** Global catalog - empty for now; can point to bundled catalog if one exists */
export function loadGlobalCatalog(): Catalog {
  return { packages: [] };
}

/** User catalog from Station (~/.atp_station/atp-catalog.yaml) */
export function loadUserCatalog(): Catalog {
  const stationPath = getStationPath();
  const catalogPath = path.join(stationPath, USER_CATALOG_FILE);

  if (!pathExists(stationPath) || !fs.existsSync(catalogPath)) {
    return { packages: [] };
  }

  const content = fs.readFileSync(catalogPath, "utf8");
  const data = yaml.load(content) as Catalog | null;
  if (!data || !Array.isArray(data.packages)) {
    return { packages: [] };
  }

  return {
    packages: data.packages.map(normalizePackage),
  };
}

/** Project catalog from ./.atp-local/catalog.yaml */
export function loadProjectCatalog(cwd: string = process.cwd()): Catalog {
  const projectBase = findProjectBase(cwd) || cwd;
  const catalogPath = path.join(projectBase, PROJECT_CATALOG_DIR, PROJECT_CATALOG_FILE);

  if (!fs.existsSync(catalogPath)) {
    return { packages: [] };
  }

  const content = fs.readFileSync(catalogPath, "utf8");
  const data = yaml.load(content) as Catalog | null;
  if (!data || !Array.isArray(data.packages)) {
    return { packages: [] };
  }

  return {
    packages: data.packages.map(normalizePackage),
  };
}

function normalizePackage(entry: unknown): CatalogPackage {
  if (entry && typeof entry === "object" && "name" in entry) {
    const p = entry as Record<string, unknown>;
    return {
      name: String(p.name ?? ""),
      version: p.version != null ? String(p.version) : undefined,
      description: p.description != null ? String(p.description) : undefined,
      location: p.location != null ? String(p.location) : undefined,
    };
  }
  return { name: "" };
}
