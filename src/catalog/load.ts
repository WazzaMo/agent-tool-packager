/**
 * Load catalogs from global (bundled), user (Station), and project sources.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { getStationPath, pathExists, findProjectBase } from "../config/paths.js";
import type { Catalog, CatalogPackage, CatalogRoot, CatalogPackages } from "./types.js";

const USER_CATALOG_FILE = "atp-catalog.yaml";
const PROJECT_CATALOG_FILE = "catalog.yaml";
const PROJECT_CATALOG_DIR = ".atp-local";

/** Global catalog. Empty for now; can point to bundled catalog if one exists. */
export function loadGlobalCatalog(): Catalog {
  return { packages: [] };
}

function resolveCatalogData(data: unknown): Catalog | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  if ("catalog" in root && typeof root.catalog === "object") {
    return root.catalog as Catalog;
  }
  return data as Catalog;
}

function flattenPackages(packages: CatalogPackage[] | CatalogPackages | undefined): CatalogPackage[] {
  if (!packages) return [];
  if (Array.isArray(packages)) {
    return packages.map(normalizePackage);
  }
  
  const flat: CatalogPackage[] = [];
  const p = packages as CatalogPackages;
  
  if (Array.isArray(p.standard)) {
    flat.push(...p.standard.map(normalizePackage));
  }
  if (Array.isArray(p.user)) {
    flat.push(...p.user.map(normalizePackage));
  }
  
  return flat;
}

/** User catalog from Station (~/.atp_station/atp-catalog.yaml). */
export function loadUserCatalog(): Catalog {
  const stationPath = getStationPath();
  const catalogPath = path.join(stationPath, USER_CATALOG_FILE);

  if (!pathExists(stationPath) || !fs.existsSync(catalogPath)) {
    return { packages: [] };
  }

  const content = fs.readFileSync(catalogPath, "utf8");
  const raw = yaml.load(content);
  const data = resolveCatalogData(raw);
  
  if (!data) return { packages: [] };

  return {
    ...data,
    packages: flattenPackages(data.packages),
  };
}

/**
 * Project catalog from ./.atp-local/catalog.yaml.
 * @param cwd - Directory to start from. Defaults to process.cwd().
 * @returns Merged catalog from project.
 */
export function loadProjectCatalog(cwd: string = process.cwd()): Catalog {
  const projectBase = findProjectBase(cwd) || cwd;
  const catalogPath = path.join(projectBase, PROJECT_CATALOG_DIR, PROJECT_CATALOG_FILE);

  if (!fs.existsSync(catalogPath)) {
    return { packages: [] };
  }

  const content = fs.readFileSync(catalogPath, "utf8");
  const raw = yaml.load(content);
  const data = resolveCatalogData(raw);

  if (!data) return { packages: [] };

  return {
    ...data,
    packages: flattenPackages(data.packages),
  };
}

function normalizePackage(entry: unknown): CatalogPackage {
  if (typeof entry === "string") {
    return { name: entry };
  }
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
