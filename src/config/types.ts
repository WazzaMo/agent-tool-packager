/**
 * Shared types for ATP configuration.
 */

/** One agent's paths in Station `agent-paths` (home vs project layout). */
export interface AgentPathEntry {
  home_path: string;
  project_path?: string;
  rule?: string;
  prompts?: string;
  /** Hook scripts directory under project agent path (e.g. `.cursor/hooks/`). */
  hooks?: string;
  commands?: string;
  skills?: string;
}

/** Map of agent name to partial path configuration. */
export type AgentPaths = Record<string, Partial<AgentPathEntry>>;

/** `.atp_safehouse/atp-config.yaml` shape: assigned agent and Station link. */
export interface SafehouseConfig {
  agent: string | null;
  agent_path?: string | null;
  station_path: string | null;
}

/** Source of package binaries: "station" when using Station; "local" after exfiltrate or project install */
export type PackageSource = "station" | "local";

/** Where binaries are installed: user home or project Safehouse */
export type BinaryScope = "user-bin" | "project-bin";

/** One installed package row in Safehouse `manifest.yaml`. */
export interface SafehouseManifestPackage {
  name: string;
  version?: string;
  /** "station" when using Station binaries; "local" after exfiltrate or project install. Required when writing. */
  source?: PackageSource;
  /** Required when writing. */
  binary_scope?: BinaryScope;
  /** Hint for uninstall / tooling: `multi` when the catalog package used Feature 4 `parts`. */
  install_layout?: "multi" | "legacy";
  /**
   * Relative path under `.atp_safehouse` to JSON journalling MCP/hooks merges (SHA + fragments).
   */
  config_journal_path?: string;
}

/** Safehouse manifest document: installed packages and originating Station path. */
export interface SafehouseManifest {
  packages: SafehouseManifestPackage[];
  station_path: string | null;
}
