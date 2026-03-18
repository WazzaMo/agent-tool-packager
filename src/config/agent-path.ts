/**
 * Resolve agent project path from Station config.
 * Returns project_path from agent-paths if configured, else default `.{agent}/`.
 *
 * @param agentName - Agent name (e.g. cursor, claude).
 * @param stationConfig - Station config with agent-paths. May be null.
 * @returns Relative project path (e.g. .cursor/).
 */

import type { StationConfig } from "./station-config.js";

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
