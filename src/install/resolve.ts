/**
 * Resolve package from catalog and load its manifest.
 * Supports file:// paths only for now.
 */

import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { loadStationCatalog, effectiveStationCatalogPackages } from "../catalog/load.js";

import type { PackageManifest } from "./types.js";
import type { CatalogPackage } from "../catalog/types.js";

const MANIFEST_NAMES = ["atp-package.yaml", "package.yaml"];

/**
 * Resolve package by name from the effective Station catalog (user overrides standard).
 *
 * @param name - Package name.
 * @param _cwd - Reserved for future cwd-relative catalog; catalog is Station-only today.
 * @returns Catalog row, or `null` if not listed.
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
 * Parse `file://` URL to a filesystem path string (may still be relative).
 *
 * @param location - URL string (e.g. `file:///path/to/pkg`).
 * @returns Path after the `file://` prefix, or `null` if not a `file` URL.
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
 * Load the first existing `atp-package.yaml` or `package.yaml` under `pkgDir`.
 *
 * @param pkgDir - Package directory path.
 * @returns Parsed manifest with a string `name`, or `null` if none valid.
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
 * Resolve a catalog `location` to an existing package directory (`file://` only).
 *
 * @param location - File URL or path fragment from the catalog.
 * @param cwd - Project base for relative paths. Defaults to `process.cwd()`.
 * @returns Absolute directory path, or `null` when missing or not a directory.
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
