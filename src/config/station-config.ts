/**
 * Station configuration types and defaults.
 * See docs/configuration.md for schema.
 */

import type { CatalogRoot } from "../catalog/types.js";

import type { AgentPaths } from "./types.js";

export interface StandardCatalogConfig {
  url: string;
}

export interface StationConfig {
  configuration: {
    version: string;
    "agent-paths": AgentPaths;
    "standard-catalog": StandardCatalogConfig;
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
    project_path: ".gemini/",
    rule: "rules/",
    skills: "skills/",
  },
};

export const DEFAULT_STATION_CONFIG: StationConfig = {
  configuration: {
    version: "0.1.0",
    "agent-paths": DEFAULT_AGENT_PATHS,
    "standard-catalog": {
      url: "https://agent-tool-packager.example.com/packages/0.1.0/",
    },
  },
};

export interface SafehouseListConfig {
  safehouse_paths: string[];
}

export const DEFAULT_SAFEHOUSE_LIST: SafehouseListConfig = {
  safehouse_paths: [],
};

export const DEFAULT_CATALOG: CatalogRoot = {
  catalog: {
    "standard_packages-path": "./standard_packages/",
    "user_packages-path": "./user_packages/",
    packages: {
      standard: [],
      user: [],
    },
  },
};
