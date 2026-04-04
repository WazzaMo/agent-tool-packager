/**
 * Station configuration types and defaults.
 * See docs/configuration.md for schema.
 */

import { atp_version } from "../version.js";

import type { AgentPaths } from "./types.js";
import type { CatalogRoot } from "../catalog/types.js";


/** Remote or local URL prefix for the standard catalog payload. */
export interface StandardCatalogConfig {
  url: string;
}

/** Root of `atp-config.yaml` under the Station directory. */
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
    prompts: "prompts/",
    hooks: "hooks/",
    commands: "commands/",
    skills: "skills/",
  },
  codex: {
    home_path: "~/.codex",
  },
  claude: {
    home_path: "~/.claude",
  },
  kiro: {
    home_path: "~/.kiro/",
    project_path: ".kiro/",
    rule: "rules/",
    prompts: "prompts/",
    hooks: "hooks/",
    commands: "commands/",
    skills: "skills/",
  },
  gemini: {
    home_path: "~/.gemini",
    project_path: ".gemini/",
    rule: "rules/",
    prompts: "prompts/",
    hooks: "hooks/",
    skills: "skills/",
  },
};

export const DEFAULT_STATION_CONFIG: StationConfig = {
  configuration: {
    version: atp_version(),
    "agent-paths": DEFAULT_AGENT_PATHS,
    "standard-catalog": {
      url: "https://agent-tool-packager.example.com/packages/0.1.0/",
    },
  },
};

/** `atp-safehouse-list.yaml`: known project Safehouse paths registered with Station. */
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
