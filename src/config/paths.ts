/**
 * Path resolution for Station and Safehouse.
 * Respects STATION_PATH env var; defaults to ~/.atp_station.
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
export const DEFAULT_STATION_PATH = path.join(os.homedir(), ".atp_station");

/**
 * Resolve the Station directory path.
 * Uses STATION_PATH env var if set; otherwise ~/.atp_station.
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
  return path.join(cwd, ".atp_safehouse");
}

/** Check if a path exists and is a directory */
export function pathExists(dir: string): boolean {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

const PROJECT_BASE_MARKERS = [".git", ".vscode"];
const PROJECT_BASE_RADIUS = 2;

/**
 * Find project base directory by examining cwd and parents (radius 2).
 * Respects SAFEHOUSE_PROJECT_PATH environment variable if set.
 * Looks for .git or .vscode as evidence of project base. Feature 3 acceptance criteria.
 * @returns Project base path or null if not found
 */
export function findProjectBase(cwd: string = process.cwd()): string | null {
  // Check environment variable override first
  const envPath = process.env.SAFEHOUSE_PROJECT_PATH;
  if (envPath) {
    const resolvedEnvPath = path.resolve(expandHome(envPath));
    if (fs.existsSync(resolvedEnvPath) && fs.statSync(resolvedEnvPath).isDirectory()) {
      return resolvedEnvPath;
    }
  }

  let dir = path.resolve(cwd);
  for (let i = 0; i <= PROJECT_BASE_RADIUS; i++) {
    for (const marker of PROJECT_BASE_MARKERS) {
      const markerPath = path.join(dir, marker);
      if (fs.existsSync(markerPath)) {
        return dir;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Check if a directory looks like a user's home directory (anti-pattern).
 */
export function isHomeDirectory(dir: string): boolean {
  const resolved = path.resolve(dir);
  const home = os.homedir();
  if (resolved === home) return true;

  // Additional heuristic checks from Feature 3
  const parent = path.dirname(resolved);
  if (path.basename(parent) === "home") {
    // If it's something like /home/user
    if (fs.existsSync(path.join(resolved, ".ssh"))) return true;
    if (fs.existsSync(path.join(resolved, ".bashrc"))) return true;
  }
  return false;
}
