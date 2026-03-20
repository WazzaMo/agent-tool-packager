/**
 * Catalog types for ATP packages.
 * Station atp-catalog.yaml uses nested standard / user lists only.
 */

export interface CatalogPackage {
  name: string;
  version?: string;
  description?: string;
  /** Package source (e.g. file:// path). May be omitted or empty when not yet resolved. */
  location?: string;
}

/**
 * Under `packages` in atp-catalog.yaml: both `standard` and `user` must be present
 * as YAML arrays (empty `[]` is valid). Each element must be a mapping with at least `name`.
 */
export interface CatalogPackages {
  standard: CatalogPackage[];
  user: CatalogPackage[];
}

export interface Catalog {
  "standard_packages-path"?: string;
  "user_packages-path"?: string;
  packages: CatalogPackages;
}

/** Root structure for atp-catalog.yaml as per docs/configuration.md */
export interface CatalogRoot {
  catalog: Catalog;
}
