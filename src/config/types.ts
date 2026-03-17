/**
 * Shared types for ATP configuration.
 */

export interface AgentPathEntry {
  home_path: string;
  project_path?: string;
  rule?: string;
  commands?: string;
  skills?: string;
}

export type AgentPaths = Record<string, Partial<AgentPathEntry>>;

export interface SafehouseConfig {
  agent: string | null;
  agent_path?: string | null;
  station_path: string | null;
}

/** Source of package binaries: "station" when using Station; "local" after exfiltrate or project install */
export type PackageSource = "station" | "local";

/** Where binaries are installed: user home or project Safehouse */
export type BinaryScope = "user-bin" | "project-bin";

export interface SafehouseManifestPackage {
  name: string;
  version?: string;
  /** "station" when using Station binaries; "local" after exfiltrate or project install. Required when writing. */
  source?: PackageSource;
  /** Required when writing. */
  binary_scope?: BinaryScope;
}

export interface SafehouseManifest {
  packages: SafehouseManifestPackage[];
  station_path: string | null;
}
