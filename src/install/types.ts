/**
 * Package manifest types for atp-package.yaml / package.yaml.
 * Schema from docs/features/1-package-definition-and-installation.md.
 */

import type { PackagePart } from "../package/types.js";

/** One installable asset row from the catalog / enriched manifest. */
export interface PackageAsset {
  path: string;
  type: "skill" | "rule" | "prompt" | "hook" | "program" | "sub-agent";
  name: string;
}

/** Optional program metadata for dependencies and runtimes. */
export interface ProgramDefinition {
  asset_name: string;
  runtime?: "node" | "deno" | "bun" | "python" | "x64" | "arm";
  command?: string;
  included?: boolean;
  dependency?: { name: string; version?: string };
}

/** Parsed install manifest (developer or enriched) used during install/remove. */
export interface PackageManifest {
  name: string;
  /** Legacy single-type root kind, or `Multi` for Feature 4 multi-part packages. */
  type?: string;
  version?: string;
  description?: string;
  repo_source?: {
    path?: string;
    url?: string;
    version?: string;
  };
  provider?: {
    author?: string;
    organisation?: string;
  };
  assets?: PackageAsset[];
  /** Bundle paths for text patching {bundle_name} placeholders. From atp-package.yaml. */
  bundles?: Array<string | { path: string; "exec-filter"?: string }>;
  program_dependencies?: string[];
  program_definitions?: ProgramDefinition[];
  /** Feature 4: when non-empty in catalog `atp-package.yaml`, install treats layout as multi-part. */
  parts?: PackagePart[];
}
