/**
 * Resolve agent project path from Station config.
 * Returns project_path from agent-paths if configured, else default `.{agent}/`.
 *
 * @param agentName - Agent name (e.g. cursor, claude).
 * @param stationConfig - Station config with agent-paths. May be null.
 * @returns Relative project path (e.g. .cursor/).
 */

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
