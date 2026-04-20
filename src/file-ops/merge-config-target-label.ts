/**
 * Human-readable labels for merged agent JSON (CLI errors and `--help` copy).
 */

import path from "node:path";

/**
 * Build a short path such as `.gemini/settings.json` or `.cursor/mcp.json` for user-facing messages.
 *
 * @param layerRoot - Absolute agent layer directory (e.g. project `.gemini/`).
 * @param relativeTargetPath - Path under {@link layerRoot} (posix-style).
 * @returns Label like `<agentDirBasename>/<relative>`.
 */
export function mergeConfigTargetLabel(layerRoot: string, relativeTargetPath: string): string {
  const agentDir = path.basename(path.resolve(layerRoot));
  const rel = relativeTargetPath.replace(/\\/g, "/");
  return `${agentDir}/${rel}`;
}
