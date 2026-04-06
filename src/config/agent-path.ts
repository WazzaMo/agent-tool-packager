/**
 * Resolve agent project path from Station config.
 * Returns project_path from agent-paths if configured, else default `.{agent}/`.
 *
 * @param agentName - Agent name (e.g. cursor, claude).
 * @param stationConfig - Station config with agent-paths. May be null.
 * @returns Relative project path (e.g. .cursor/).
 */

import path from "node:path";
import os from "node:os";

import { DEFAULT_AGENT_PATHS } from "./station-config.js";

import type { StationConfig } from "./station-config.js";

/**
 * Check if agent is registered in Station's agent-paths.
 * Feature 3: only agents with entries in agent-paths should be accepted.
 *
 * @param agentName - Agent name to check.
 * @param stationConfig - Station config. May be null.
 * @returns True if agent has an entry in agent-paths.
 */
export function isAgentInStationConfig(
  agentName: string,
  stationConfig: StationConfig | null
): boolean {
  const paths = stationConfig?.configuration?.["agent-paths"];
  if (!paths || typeof paths !== "object") return false;
  return Object.prototype.hasOwnProperty.call(paths, agentName);
}

/**
 * Resolve the agent-relative project directory (rules, skills, commands root under the repo).
 * Uses `agent-paths.<agent>.project_path` when set; otherwise `.{agent}/`.
 *
 * @param agentName - Agent key (e.g. `cursor`, `claude`).
 * @param stationConfig - Loaded Station config; may be `null`.
 * @returns Relative path with trailing slash when configured that way (e.g. `.cursor/`).
 */
export function resolveAgentProjectPath(
  agentName: string,
  stationConfig: StationConfig | null
): string {
  const entry = stationConfig?.configuration?.["agent-paths"]?.[agentName];
  if (entry?.project_path) {
    return entry.project_path;
  }
  return `.${agentName}/`;
}

/**
 * Absolute agent “home” directory (e.g. `~/.cursor/`) from Station `agent-paths` defaults.
 * Used for provider `InstallContext.layerRoot` when the active layer is `user`.
 *
 * @param agentName - Agent key (e.g. `cursor`).
 * @param stationConfig - Station config; `null` uses {@link DEFAULT_AGENT_PATHS}.
 * @returns Normalised absolute path.
 */
export function resolveAgentHomePath(
  agentName: string,
  stationConfig: StationConfig | null
): string {
  const entry = stationConfig?.configuration?.["agent-paths"]?.[agentName];
  const raw =
    entry?.home_path ??
    DEFAULT_AGENT_PATHS[agentName]?.home_path ??
    `~/.${agentName}/`;
  if (raw.startsWith("~/")) {
    const rel = raw.slice(2).replace(/[/\\]+$/, "");
    return path.normalize(path.join(os.homedir(), rel));
  }
  if (raw.startsWith("~") && (raw.length === 1 || raw[1] === "/")) {
    const rel = raw.slice(1).replace(/^\//, "").replace(/[/\\]+$/, "");
    return path.normalize(path.join(os.homedir(), rel));
  }
  const abs = path.isAbsolute(raw) ? raw : path.join(os.homedir(), raw);
  return path.normalize(abs.replace(/[/\\]+$/, ""));
}
