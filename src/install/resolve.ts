/**
 * Resolve package from catalog and load its manifest.
 * Supports file:// paths only for now.
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  loadGlobalCatalog,
  loadProjectCatalog,
  loadUserCatalog,
} from "../catalog/load.js";
import { mergeCatalogs } from "../catalog/merge.js";
import type { CatalogPackage } from "../catalog/types.js";
import type { PackageManifest } from "./types.js";

const MANIFEST_NAMES = ["atp-package.yaml", "package.yaml"];

/** Resolve package by name from merged catalog. Returns null if not found. */
export function resolvePackage(
  name: string,
  cwd: string = process.cwd()
): CatalogPackage | null {
  const global = loadGlobalCatalog();
  const user = loadUserCatalog();
  const project = loadProjectCatalog(cwd);
  const merged = mergeCatalogs(global, user, project);

  const pkg = merged.find((p) => p.name === name);
  return pkg ?? null;
}

/** Parse file:// URL to filesystem path */
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

/** Load package manifest from package directory. Returns null if not found. */
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

/** Resolve package location to absolute path. Returns null for non-file locations. */
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
