/**
 * Catalog types for ATP packages.
 */

export interface CatalogPackage {
  name: string;
  version?: string;
  description?: string;
  location?: string;
}

export interface CatalogPackages {
  standard?: (string | CatalogPackage)[];
  user?: (string | CatalogPackage)[];
}

export interface Catalog {
  "standard_packages-path"?: string;
  "user_packages-path"?: string;
  packages: CatalogPackage[] | CatalogPackages;
}

/** Root structure for atp-catalog.yaml as per docs/configuration.md */
export interface CatalogRoot {
  catalog: Catalog;
}

