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

export interface SafehouseManifestPackage {
  name: string;
  version?: string;
  /** "station" when using Station binaries; "local" after exfiltrate or project install */
  source?: "station" | "local";
  binary_scope?: "user-bin" | "project-bin";
}

export interface SafehouseManifest {
  packages: SafehouseManifestPackage[];
  station_path: string | null;
}
