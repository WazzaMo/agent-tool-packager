/**
 * Load the Station catalog from atp-catalog.yaml (STATION_PATH).
 * Install targets (user home vs project agent dirs) are chosen at install time, not via extra catalogs.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { getStationPath, pathExists } from "../config/paths.js";

import type { Catalog, CatalogPackage, CatalogPackages } from "./types.js";

const STATION_CATALOG_FILE = "atp-catalog.yaml";

const EMPTY_PACKAGES: CatalogPackages = { standard: [], user: [] };

/** Catalog with no packages (missing Station or missing file). */
export function emptyCatalog(): Catalog {
  return { packages: { ...EMPTY_PACKAGES } };
}

/** Parse one list item: must be a non-array object with a non-empty `name` string. */
function parseCatalogPackageObject(entry: unknown): CatalogPackage | null {
  if (
    entry === null ||
    typeof entry !== "object" ||
    Array.isArray(entry) ||
    !("name" in entry)
  ) {
    return null;
  }
  const p = entry as Record<string, unknown>;
  const name = String(p.name ?? "").trim();
  if (!name) {
    return null;
  }
  const version = p.version != null ? String(p.version) : undefined;
  const description = p.description != null ? String(p.description) : undefined;
  let location: string | undefined;
  if (p.location != null && String(p.location).trim() !== "") {
    location = String(p.location);
  }
  return { name, version, description, location };
}

/**
 * Parse `packages` from catalog YAML. Requires an object with `standard` and `user` arrays
 * of package objects (not name-only strings). Legacy flat `packages: [ ... ]` is rejected.
 * Any invalid shape or bad list item yields empty `standard` and `user`.
 */
export function parseCatalogPackagesField(packages: unknown): CatalogPackages {
  if (packages == null) {
    return { ...EMPTY_PACKAGES };
  }
  if (typeof packages !== "object" || Array.isArray(packages)) {
    return { ...EMPTY_PACKAGES };
  }
  const o = packages as Record<string, unknown>;
  const standardRaw = o.standard;
  const userRaw = o.user;
  if (!Array.isArray(standardRaw) || !Array.isArray(userRaw)) {
    return { ...EMPTY_PACKAGES };
  }

  const standard: CatalogPackage[] = [];
  for (const entry of standardRaw) {
    const pkg = parseCatalogPackageObject(entry);
    if (!pkg) {
      return { ...EMPTY_PACKAGES };
    }
    standard.push(pkg);
  }

  const user: CatalogPackage[] = [];
  for (const entry of userRaw) {
    const pkg = parseCatalogPackageObject(entry);
    if (!pkg) {
      return { ...EMPTY_PACKAGES };
    }
    user.push(pkg);
  }

  return { standard, user };
}

function resolveCatalogData(data: unknown): Catalog | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  if ("catalog" in root && typeof root.catalog === "object" && root.catalog !== null) {
    return root.catalog as Catalog;
  }
  return data as Catalog;
}

function normalizeLoadedCatalog(data: Catalog): Catalog {
  return {
    ...data,
    packages: parseCatalogPackagesField(data.packages as unknown),
  };
}

/** All packages from a catalog (standard entries, then user entries). */
export function listAllCatalogPackages(catalog: Catalog): CatalogPackage[] {
  return [...catalog.packages.standard, ...catalog.packages.user];
}

/**
 * Unique packages by name for install and `catalog list`: `user` overrides `standard`.
 */
export function effectiveStationCatalogPackages(catalog: Catalog): CatalogPackage[] {
  const byName = new Map<string, CatalogPackage>();
  for (const p of catalog.packages.standard) {
    byName.set(p.name, p);
  }
  for (const p of catalog.packages.user) {
    byName.set(p.name, p);
  }
  return Array.from(byName.values());
}

/**
 * Load the Station catalog (${STATION_PATH}/atp-catalog.yaml).
 * @returns Parsed catalog, or empty packages if Station or file is missing.
 */
export function loadStationCatalog(): Catalog {
  const stationPath = getStationPath();
  const catalogPath = path.join(stationPath, STATION_CATALOG_FILE);

  if (!pathExists(stationPath) || !fs.existsSync(catalogPath)) {
    return emptyCatalog();
  }

  const content = fs.readFileSync(catalogPath, "utf8");
  const raw = yaml.load(content);
  const data = resolveCatalogData(raw);

  if (!data) return emptyCatalog();

  return normalizeLoadedCatalog(data);
}
