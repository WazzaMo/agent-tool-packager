/**
 * Catalog types for AHQ packages.
 */

export interface CatalogPackage {
  name: string;
  version?: string;
  description?: string;
  location?: string;
}

export interface Catalog {
  packages: CatalogPackage[];
}
