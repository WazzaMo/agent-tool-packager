/**
 * Package manifest types for atp-package.yaml / package.yaml.
 * Schema from docs/features/1-package-definition-and-installation.md.
 */

export interface PackageAsset {
  path: string;
  type: "skill" | "rule" | "program" | "sub-agent";
  name: string;
}

export interface ProgramDefinition {
  asset_name: string;
  runtime?: "node" | "deno" | "bun" | "python" | "x64" | "arm";
  command?: string;
  included?: boolean;
  dependency?: { name: string; version?: string };
}

export interface PackageManifest {
  name: string;
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
  program_dependencies?: string[];
  program_definitions?: ProgramDefinition[];
}
