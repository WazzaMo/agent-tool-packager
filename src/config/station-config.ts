/**
 * Station configuration types and defaults.
 * See docs/configuration.md for schema.
 */

import type { AgentPaths } from "./types.js";

export interface StationConfig {
  configuration: {
    version: string;
    "agent-paths": AgentPaths;
  };
}

export const DEFAULT_AGENT_PATHS: AgentPaths = {
  cursor: {
    home_path: "~/.cursor/",
    project_path: ".cursor/",
    rule: "rules/",
    commands: "commands/",
    skills: "skills/",
  },
  codex: {
    home_path: "~/.codex",
  },
  claude: {
    home_path: "~/.claude",
  },
  gemini: {
    home_path: "~/.gemini",
  },
};

export const DEFAULT_STATION_CONFIG: StationConfig = {
  configuration: {
    version: "0.1.0",
    "agent-paths": DEFAULT_AGENT_PATHS,
  },
};

export interface SafehouseListConfig {
  safehouse_paths: string[];
}

export const DEFAULT_SAFEHOUSE_LIST: SafehouseListConfig = {
  safehouse_paths: [],
};

export const DEFAULT_CATALOG = {
  packages: [],
};
