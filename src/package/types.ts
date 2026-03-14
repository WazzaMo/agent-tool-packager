/**
 * Package manifest types for atp-package.yaml (Feature 2 developer workflow).
 * Supports both Package root (YAML) and flat format for compatibility with install.
 */

export type PackageType = "Rule" | "Skill" | "Mcp" | "Command" | "Experimental";

/** Flat structure we use when reading/writing atp-package.yaml */
export interface DevPackageManifest {
  name?: string;
  type?: string;
  developer?: string;
  license?: string;
  version?: string;
  copyright?: string[];
  usage?: string[];
  components?: string[];
  bundles?: string[];
}
