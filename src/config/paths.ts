/**
 * Path resolution for Station and Safehouse.
 * Respects STATION_PATH env var; defaults to ~/.ahq_station.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Expand ~ to home directory */
export function expandHome(p: string): string {
  if (p.startsWith("~/") || p === "~") {
    return path.join(os.homedir(), p.slice(1));
  }
  if (p.startsWith("$HOME")) {
    return path.join(os.homedir(), p.slice(5));
  }
  return p;
}

/** Default station path when STATION_PATH is not set */
export const DEFAULT_STATION_PATH = path.join(os.homedir(), ".ahq_station");

/**
 * Resolve the Station directory path.
 * Uses STATION_PATH env var if set; otherwise ~/.ahq_station.
 */
export function getStationPath(): string {
  const env = process.env.STATION_PATH;
  if (env) {
    return expandHome(env);
  }
  return DEFAULT_STATION_PATH;
}

/**
 * Resolve the Safehouse path for the current working directory.
 */
export function getSafehousePath(cwd: string = process.cwd()): string {
  return path.join(cwd, ".ahq_safehouse");
}

/** Check if a path exists and is a directory */
export function pathExists(dir: string): boolean {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}
