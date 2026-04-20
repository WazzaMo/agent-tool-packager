/**
 * Package manifest types for atp-package.yaml (Feature 2 developer workflow).
 * Supports both Package root (YAML) and flat format for compatibility with install.
 */

/** Canonical package kinds used in manifests and validation. */
export type PackageType =
  | "Rule"
  | "Prompt"
  | "Skill"
  | "Hook"
  | "Mcp"
  | "Command"
  | "Experimental";

/** Bundle entry with optional exec glob for non-UNIX layouts. */
export interface BundleDefinition {
  path: string;
  "exec-filter"?: string;
  /** When true, the bundle has no program assets (no `bin/` scan, no exec glob). */
  "skip-exec"?: boolean;
}

/** One typed slice of a Multi package (Feature 4). */
export interface PackagePart {
  type: string;
  usage: string[];
  components?: string[];
  bundles?: (string | BundleDefinition)[];
}

/** In-memory shape for developer `atp-package.yaml` (flat format). */
export interface DevPackageManifest {
  name: string;
  type: string;
  version: string;
  usage: string[];
  components: string[];
  /** Present when root type is Multi (Feature 4). */
  parts?: PackagePart[];
  developer?: string;
  license?: string;
  copyright?: string[];
  bundles?: (string | BundleDefinition)[];
}
