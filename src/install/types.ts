/**
 * Package manifest types for atp-package.yaml / package.yaml.
 * Schema from docs/features/1-package-definition-and-installation.md.
 */

import type { CatalogPackage } from "../catalog/types.js";
import type { PackagePart } from "../package/types.js";

/** Whether install prompts apply to the project Safehouse or Station scope. */
export type PromptScope = "project" | "station";

/** Where program assets are installed when applicable. */
export type BinaryScope = "user-bin" | "project-bin";

/** Options for `installPackage` in `install.ts`. */
export interface InstallOptions {
  promptScope: PromptScope;
  binaryScope: BinaryScope;
  /** When true, recursively install `program_dependencies` from the catalog first. */
  dependencies: boolean;
  /** Replace conflicting MCP server entries on merge (Cursor `mcp.json`). */
  forceConfig?: boolean;
  /** Skip MCP / hooks JSON merges (no read or write of those files). */
  skipConfig?: boolean;
}

/** Arguments shared by catalog install entry points and {@link buildProviderInstallContext}. */
export interface CatalogInstallContext {
  pkgDir: string;
  manifest: PackageManifest;
  agentBase: string;
  bundlePathMap: Record<string, string> | undefined;
  installBinDir: string | undefined;
  catalogPkg: CatalogPackage;
  opts: InstallOptions;
  projectBase: string;
}

/** One installable asset row from the catalog / enriched manifest. */
export interface PackageAsset {
  path: string;
  type: "skill" | "rule" | "prompt" | "hook" | "program" | "sub-agent" | "mcp";
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
