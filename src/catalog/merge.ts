/**
 * Merge catalogs with precedence: project overrides user overrides global.
 * Same package name → higher scope wins.
 */

import type { Catalog, CatalogPackage } from "./types.js";

export function mergeCatalogs(
  global: Catalog,
  user: Catalog,
  project: Catalog
): CatalogPackage[] {
  const byName = new Map<string, CatalogPackage>();

  for (const pkg of [...global.packages, ...user.packages, ...project.packages]) {
    byName.set(pkg.name, pkg);
  }

  return Array.from(byName.values());
}
