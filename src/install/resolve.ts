/**
 * Resolve package from catalog and load its manifest.
 * Supports file:// paths only for now.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { loadStationCatalog, effectiveStationCatalogPackages } from "../catalog/load.js";

import type { CatalogPackage } from "../catalog/types.js";
import type { PackageManifest } from "./types.js";

const MANIFEST_NAMES = ["atp-package.yaml", "package.yaml"];

/**
 * Resolve package by name from the Station catalog.
 * @param name - Package name.
 * @param _cwd - Reserved for callers; catalog is Station-only.
 * @returns Catalog package or null if not found.
 */
export function resolvePackage(
  name: string,
  _cwd: string = process.cwd()
): CatalogPackage | null {
  const station = loadStationCatalog();
  const packages = effectiveStationCatalogPackages(station);
  const pkg = packages.find((p) => p.name === name);
  return pkg ?? null;
}

/**
 * Parse file:// URL to filesystem path.
 * @param location - URL string (e.g. file:///path/to/pkg).
 * @returns Absolute path or null if not a file URL.
 */
function parseFileUrl(location: string): string | null {
  if (!location.startsWith("file://")) {
    return null;
  }
  const rest = location.slice(7);
  if (rest.startsWith("//")) {
    return rest.slice(1);
  }
  return rest;
}

/**
 * Load package manifest from package directory.
 * @param pkgDir - Package directory path.
 * @returns Package manifest or null if not found.
 */
export function loadPackageManifest(pkgDir: string): PackageManifest | null {
  for (const name of MANIFEST_NAMES) {
    const manifestPath = path.join(pkgDir, name);
    if (!fs.existsSync(manifestPath)) continue;

    const content = fs.readFileSync(manifestPath, "utf8");
    const data = yaml.load(content) as PackageManifest | null;
    if (data && typeof data.name === "string") {
      return data;
    }
  }
  return null;
}

/**
 * Resolve package location to absolute path.
 * @param location - File URL (file://) or path.
 * @param cwd - Project base for relative paths. Defaults to process.cwd().
 * @returns Absolute path or null for non-file locations.
 */
export function resolvePackagePath(
  location: string | undefined,
  cwd: string = process.cwd()
): string | null {
  if (!location) return null;

  const filePath = parseFileUrl(location);
  if (!filePath) return null;

  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(cwd, filePath);

  return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
    ? resolved
    : null;
}
